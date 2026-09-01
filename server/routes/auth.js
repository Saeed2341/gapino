const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const OtpCode = require("../models/OtpCode");
const { sendOtpSms, normalizePhone } = require("../services/sms");
const auth = require("../middleware/auth");

const SMS_TEST_MODE = process.env.SMS_TEST_MODE === "true";
const DEV_UNIVERSAL_CODE = "111111";

const PHONE_REGEX = /^09\d{9}$/;
const CODE_REGEX = /^\d{6}$/;
const CODE_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;

const rateMap = new Map();

function otpRateLimit(req, res, next) {
  const phone = normalizePhone(req.body.phone);
  const now = Date.now();
  const entry = rateMap.get(phone);
  if (!entry || now > entry.resetAt) {
    rateMap.set(phone, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return next();
  }
  if (entry.count >= 3) {
    return res.status(429).json({
      message: "درخواست‌های زیادی ارسال شده. کمی بعد دوباره تلاش کن.",
    });
  }
  entry.count++;
  next();
}

async function generateUniqueUsername() {
  for (let i = 0; i < 5; i++) {
    const candidate = "user_" + crypto.randomBytes(3).toString("hex");
    const exists = await User.findOne({ username: candidate }).lean();
    if (!exists) return candidate;
  }
  return "user_" + crypto.randomBytes(8).toString("hex");
}

// ── ۱) درخواست کد ──
router.post("/request-code", otpRateLimit, async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!PHONE_REGEX.test(phone)) {
      return res.status(400).json({ message: "شماره موبایل معتبر نیست." });
    }

    const code = String(crypto.randomInt(100000, 999999));
    const hashedCode = await bcrypt.hash(code, 10);

    await OtpCode.findOneAndUpdate(
      { phone },
      {
        phone,
        code: hashedCode,
        attempts: 0,
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
      },
      { upsert: true },
    );

    await sendOtpSms(phone, code);
    res.json({ message: "کد تأیید پیامک شد." });
  } catch (err) {
    console.error("request-code error:", err);
    res
      .status(500)
      .json({ message: err.message || "خطا در ارسال پیامک. دوباره تلاش کن." });
  }
});

// ── ۲) تأیید کد ──
router.post("/verify-code", async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.code || "").trim();

    if (!PHONE_REGEX.test(phone) || !CODE_REGEX.test(code)) {
      return res
        .status(400)
        .json({ message: "شماره یا کد وارد شده معتبر نیست." });
    }
    // ── درگاه توسعه: کد همگانی فقط وقتی SMS_TEST_MODE=true ──
    if (SMS_TEST_MODE && code === DEV_UNIVERSAL_CODE) {
      let devUser = await User.findOne({ phone });
      let isNew = false;
      if (!devUser) {
        isNew = true;
        devUser = await User.create({
          phone,
          displayName: "کاربر " + phone.slice(-4),
          username: await generateUniqueUsername(),
        });
      }
      const devToken = jwt.sign(
        { id: devUser._id.toString() },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        },
      );
      return res.json({ token: devToken, isNew, user: devUser.toSafeJSON() });
    }
    const otpDoc = await OtpCode.findOne({ phone });
    if (!otpDoc) {
      return res
        .status(400)
        .json({ message: "کدی برای این شماره یافت نشد. دوباره درخواست بده." });
    }
    if (otpDoc.expiresAt < new Date()) {
      await otpDoc.deleteOne();
      return res
        .status(400)
        .json({ message: "کد منقضی شده. کد جدید درخواست کن." });
    }
    if (otpDoc.attempts >= MAX_ATTEMPTS) {
      await otpDoc.deleteOne();
      return res
        .status(429)
        .json({ message: "تلاش‌های زیادی انجام شده. کد جدید درخواست کن." });
    }

    const isMatch = await bcrypt.compare(code, otpDoc.code);
    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({
        message: "کد اشتباه است.",
        remainingAttempts: MAX_ATTEMPTS - otpDoc.attempts,
      });
    }

    await otpDoc.deleteOne();

    let user = await User.findOne({ phone });
    let isNew = false;
    if (!user) {
      isNew = true;
      user = await User.create({
        phone,
        displayName: "کاربر " + phone.slice(-4),
        username: await generateUniqueUsername(),
      });
    }

    const token = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    );

    res.json({ token, isNew, user: user.toSafeJSON() });
  } catch (err) {
    console.error("verify-code error:", err);
    res.status(500).json({ message: "خطای سرور. دوباره تلاش کن." });
  }
});

// ── ۳) اطلاعات کاربر لاگین‌شده ──
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });
    res.json({ user: user.toSafeJSON() });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

module.exports = router;
