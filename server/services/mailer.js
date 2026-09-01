const TEST_MODE = process.env.EMAIL_TEST_MODE === "true";

function otpEmailTemplate(code) {
  return `
  <!DOCTYPE html>
  <html lang="fa" dir="rtl">
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:Tahoma,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:32px 16px;">
      <div style="background:linear-gradient(135deg,#4f46e5,#06b6d4);border-radius:16px 16px 0 0;padding:24px;text-align:center;">
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

function withTimeout(ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  return { signal: controller.signal, done: () => clearTimeout(t) };
}

async function sendViaBrevo(email, code) {
  const { signal, done } = withTimeout(15000);
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      signal,
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Gapino", email: process.env.EMAIL_USER },
        to: [{ email }],
        subject: `کد ورود گپینو: ${code}`,
        htmlContent: otpEmailTemplate(code),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Brevo error (${res.status})`);
    }
  } finally {
    done();
  }
}

async function sendOtpEmail(email, code) {
  if (TEST_MODE) {
    console.log(`📧 [حالت تست] کد ورود برای ${email}: ${code}`);
    return;
  }
  await sendViaBrevo(email, code);
}

module.exports = { sendOtpEmail };
