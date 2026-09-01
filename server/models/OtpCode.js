const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  code: { type: String, required: true }, // هش‌شده با bcrypt
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

// برای هر ایمیل فقط یک کد فعال
otpSchema.index({ email: 1 }, { unique: true });

// مونگو خودش کدهای منقضی رو حذف می‌کنه
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpCode", otpSchema);
