const router = require("express").Router();
const multer = require("multer");
const { uploadImage, deleteImage } = require("../services/cloudinary");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { normalizePhone } = require("../services/sms");
const PHONE_OK = (p) => /^09\d{9}$/.test(p);
router.use(auth);

// ── آپلود عکس پروفایل ──
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("فقط تصویر مجاز است"));
  },
});

const USERNAME_REGEX = /^[a-z0-9_]{4,24}$/;
// const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ── جستجوی دقیق با ایمیل یا آیدی (برای شروع گفتگو) ──
router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase().replace(/^@+/, "");
    if (!q) return res.json({ users: [] });

    const normalized = normalizePhone(q);
    const filter = PHONE_OK(normalized)
      ? { phone: normalized }
      : { username: q };
    const users = await User.find({
      ...filter,
      _id: { $ne: req.userId },
    }).limit(5);

    res.json({ users: users.map((u) => u.toPublicJSON()) });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── لیست کاربران (تب «کاربران») ──
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const rx = new RegExp(escapeRegex(q), "i");

    const users = await User.find({
      _id: { $ne: req.userId },
      ...(q ? { $or: [{ username: rx }, { displayName: rx }] } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ users: users.map((u) => u.toPublicJSON()) });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── ویرایش پروفایل (نام، آیدی، بیو) ──
router.put("/me", async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });

    const { displayName, username, bio } = req.body;

    if (displayName !== undefined) {
      const name = String(displayName).trim();
      if (name.length < 1 || name.length > 50) {
        return res
          .status(400)
          .json({ message: "نام باید بین ۱ تا ۵۰ کاراکتر باشد." });
      }
      user.displayName = name;
    }

    if (username !== undefined) {
      const uname = String(username).trim().toLowerCase().replace(/^@+/, "");
      if (!USERNAME_REGEX.test(uname)) {
        return res.status(400).json({
          message:
            "آیدی باید ۴ تا ۲۴ کاراکتر و فقط حروف انگلیسی، عدد یا _ باشد.",
        });
      }
      const taken = await User.findOne({
        username: uname,
        _id: { $ne: req.userId },
      }).lean();
      if (taken)
        return res
          .status(400)
          .json({ message: "این آیدی قبلاً گرفته شده است." });
      user.username = uname;
    }

    if (bio !== undefined) {
      const b = String(bio).trim();
      if (b.length > 200)
        return res.status(400).json({ message: "بیو حداکثر ۲۰۰ کاراکتر است." });
      user.bio = b;
    }

    await user.save();
    res.json({ user: user.toSafeJSON() });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── تنظیمات (مخفی کردن آخرین بازدید) ──
router.put("/me/settings", async (req, res) => {
  try {
    const { hideLastSeen } = req.body;
    if (typeof hideLastSeen !== "boolean") {
      return res.status(400).json({ message: "مقدار نامعتبر است." });
    }
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });

    user.settings.hideLastSeen = hideLastSeen;
    await user.save();
    res.json({ user: user.toSafeJSON() });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── تغییر عکس پروفایل ──
router.post("/me/avatar", (req, res) => {
  avatarUpload.single("avatar")(req, res, async (err) => {
    if (err) {
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "حجم تصویر حداکثر ۲ مگابایت است."
          : err.message;
      return res.status(400).json({ message: msg });
    }
    try {
      if (!req.file)
        return res.status(400).json({ message: "فایلی ارسال نشد." });

      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });

      // حذف عکس قبلی از ابر
      if (user.avatarPublicId) await deleteImage(user.avatarPublicId);

      const b64 = req.file.buffer.toString("base64");
      const dataUri = `data:${req.file.mimetype};base64,${b64}`;
      const { url, publicId } = await uploadImage(dataUri, "avatars");

      user.avatar = url;
      user.avatarPublicId = publicId;
      await user.save();
      res.json({ user: user.toSafeJSON() });
    } catch {
      res.status(500).json({ message: "خطای سرور." });
    }
  });
});

module.exports = router;
