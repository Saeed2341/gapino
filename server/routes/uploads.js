const router = require("express").Router();
const multer = require("multer");
const { uploadImage } = require("../services/cloudinary");
const auth = require("../middleware/auth");

router.use(auth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("فقط تصویر مجاز است"));
  },
});

router.post("/image", (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "حجم تصویر حداکثر ۵ مگابایت است."
          : err.message;
      return res.status(400).json({ message: msg });
    }
    if (!req.file) return res.status(400).json({ message: "فایلی ارسال نشد." });
    try {
      const b64 = req.file.buffer.toString("base64");
      const dataUri = `data:${req.file.mimetype};base64,${b64}`;
      const { url, publicId } = await uploadImage(dataUri, "chat");
      res.json({ url, publicId });
    } catch {
      res.status(500).json({ message: "خطا در ذخیره تصویر." });
    }
  });
});

module.exports = router;
