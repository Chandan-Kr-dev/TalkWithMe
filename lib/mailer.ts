import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP environment variables are not configured");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendVerificationOTP(
  email: string,
  name: string,
  otp: string
) {
  const transporter = getTransporter();

  const mailOptions = {
    from: `"TalkWithMe" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your verification code – TalkWithMe",
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#f9fafb;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#6366f1,#a855f7,#ec4899);padding:32px 24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:28px;">TalkWithMe</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Real-time chat, real connections</p>
        </div>
        <div style="padding:32px 24px;">
          <h2 style="color:#1f2937;margin:0 0 8px;font-size:20px;">Hey ${name} 👋</h2>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Thanks for signing up! Enter this verification code to activate your account:
          </p>
          <div style="text-align:center;margin:24px 0;">
            <div style="display:inline-block;padding:16px 48px;background:#f3f4f6;border-radius:16px;border:2px dashed #a855f7;">
              <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1f2937;font-family:'Courier New',monospace;">${otp}</span>
            </div>
          </div>
          <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:24px 0 0;text-align:center;">
            This code expires in <strong>10 minutes</strong>. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendPasswordResetOTP(
  email: string,
  name: string,
  otp: string
) {
  const transporter = getTransporter();

  const mailOptions = {
    from: `"TalkWithMe" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Reset your password – TalkWithMe",
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#f9fafb;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#6366f1,#a855f7,#ec4899);padding:32px 24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:28px;">TalkWithMe</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Password Reset</p>
        </div>
        <div style="padding:32px 24px;">
          <h2 style="color:#1f2937;margin:0 0 8px;font-size:20px;">Hey ${name} 👋</h2>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
            We received a request to reset your password. Use this code to set a new password:
          </p>
          <div style="text-align:center;margin:24px 0;">
            <div style="display:inline-block;padding:16px 48px;background:#f3f4f6;border-radius:16px;border:2px dashed #ec4899;">
              <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1f2937;font-family:'Courier New',monospace;">${otp}</span>
            </div>
          </div>
          <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:24px 0 0;text-align:center;">
            This code expires in <strong>10 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
