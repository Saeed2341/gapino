const TEST_MODE = process.env.SMS_TEST_MODE === "true";

function normalizePhone(raw) {
  let p = String(raw || "").replace(/[\s-()]/g, "");
  if (p.startsWith("+98")) p = "0" + p.slice(3);
  else if (p.startsWith("0098")) p = "0" + p.slice(4);
  else if (p.startsWith("98") && p.length === 12) p = "0" + p.slice(2);
  else if (p.startsWith("9") && p.length === 10) p = "0" + p;
  return p;
}

async function sendOtpSms(rawPhone, code) {
  const phone = normalizePhone(rawPhone);
  if (!/^09\d{9}$/.test(phone)) {
    throw new Error("شماره موبایل معتبر نیست (فرمت: 09xxxxxxxxx)");
  }

  if (TEST_MODE) {
    console.log(`📱 [حالت تست SMS] کد ورود برای ${phone}: ${code}`);
    return phone;
  }

  const apiKey = process.env.KAVENEGAR_API_KEY;
  if (!apiKey) throw new Error("کلید کاوه‌نگار تنظیم نشده است.");

  const params = new URLSearchParams({
    receptor: phone,
    message: `کد ورود شما به گپینو: ${code}\nاین کد تا ۵ دقیقه معتبر است.`,
    ...(process.env.KAVENEGAR_SENDER ? { sender: process.env.KAVENEGAR_SENDER } : {}),
  });

  const res = await fetch(
    `https://api.kavenegar.com/v1/${apiKey}/sms/send.json?${params}`,
    { method: "GET", signal: AbortSignal.timeout(15000) }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.return?.status !== 200) {
    throw new Error(data.return?.message || "خطا در ارسال پیامک.");
  }
  return phone;
}

module.exports = { sendOtpSms, normalizePhone };