import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  if (!host || !port) {
    throw new Error(
      "Email alerts require SMTP_HOST and SMTP_PORT (see .env.example). Perfnest does not bundle an email provider."
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  return transporter;
}

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const from = process.env.ALERT_EMAIL_FROM;
  if (!from) {
    throw new Error("ALERT_EMAIL_FROM is not set (see .env.example).");
  }

  await getTransporter().sendMail({ from, to, subject, text });
}
