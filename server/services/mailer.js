const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function otpEmailTemplate(code) {
  return `
  <!DOCTYPE html>
  <html lang="fa" dir="rtl">
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:Tahoma,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:32px 16px;">
      <div style="background:linear-gradient(135deg,#6366f1,#22d3ee);border-radius:16px 16px 0 0;padding:24px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;">گپینو</h1>
      </div>
      <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px 24px;text-align:center;">
        <p style="color:#374151;font-size:15px;margin:0 0 8px;">سلام 👋</p>
        <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">کد ورود شما به گپینو:</p>
        <div style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:12px;padding:14px 32px;font-size:32px;letter-spacing:8px;font-weight:bold;color:#111827;direction:ltr;">
          ${code}
        </div>
        <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">
          این کد تا ۵ دقیقه معتبر است. اگر شما درخواست نداده‌اید، این ایمیل را نادیده بگیرید.
        </p>
      </div>
    </div>
  </body>
  </html>`;
}

async function sendOtpEmail(email, code) {
  await transporter.sendMail({
    from: `"Gapino" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `کد ورود گپینو: ${code}`,
    html: otpEmailTemplate(code),
  });
}

module.exports = { sendOtpEmail };
