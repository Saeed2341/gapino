const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const OtpCode = require("../models/OtpCode");
const { sendOtpEmail } = require("../services/mailer");
const auth = require("../middleware/auth");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_REGEX = /^\d{6}$/;
const CODE_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;

// ── Rate Limit ساده: حداکثر ۳ درخواست کد در هر ۱۰ دقیقه برای هر ایمیل ──
const rateMap = new Map();

function otpRateLimit(req, res, next) {
  const email = (req.body.email || "").toLowerCase().trim();
  const now = Date.now();
  const entry = rateMap.get(email);

  if (!entry || now > entry.resetAt) {
    rateMap.set(email, { count: 1, resetAt: now + 10 * 60 * 1000 });
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

// ساخت آیدی یکتای موقت برای کاربر جدید
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
    const email = (req.body.email || "").toLowerCase().trim();
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "ایمیل معتبر نیست." });
    }

    const code = String(crypto.randomInt(100000, 999999));
    const hashedCode = await bcrypt.hash(code, 10);

    await OtpCode.findOneAndUpdate(
      { email },
      {
        code: hashedCode,
        attempts: 0,
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
      },
      { upsert: true },
    );

    await sendOtpEmail(email, code);

    res.json({ message: "کد تأیید به ایمیل ارسال شد." });
  } catch (err) {
    console.error("request-code error:", err);
    res.status(500).json({ message: "خطا در ارسال ایمیل. دوباره تلاش کن." });
  }
});

// ── ۲) تأیید کد ──
router.post("/verify-code", async (req, res) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim();
    const code = String(req.body.code || "").trim();

    if (!EMAIL_REGEX.test(email) || !CODE_REGEX.test(code)) {
      return res
        .status(400)
        .json({ message: "ایمیل یا کد وارد شده معتبر نیست." });
    }

    const otpDoc = await OtpCode.findOne({ email });
    if (!otpDoc) {
      return res
        .status(400)
        .json({ message: "کدی برای این ایمیل یافت نشد. دوباره درخواست بده." });
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

    // کد درست بود → حذفش کن
    await otpDoc.deleteOne();

    // پیدا کردن یا ساخت کاربر
    let user = await User.findOne({ email });
    let isNew = false;

    if (!user) {
      isNew = true;
      user = await User.create({
        email,
        displayName: email.split("@")[0],
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
