import nodemailer from "nodemailer";
import { siteConfig } from "@/config/site";

function transport() {
  if (process.env.EMAIL_SERVER) {
    return nodemailer.createTransport(process.env.EMAIL_SERVER);
  }

  const host = process.env.EMAIL_SERVER_HOST;
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;
  const port = Number(process.env.EMAIL_SERVER_PORT ?? 465);

  if (!host || !user || !pass) {
    throw new Error("Email is not configured.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function fromAddress(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (from) return from;
  const support = siteConfig.supportEmail;
  if (!support) throw new Error("EMAIL_FROM is not configured.");
  return `Pantaker <${support}>`;
}

export async function sendLoginCodeEmail(to: string, code: string): Promise<void> {
  await transport().sendMail({
    from: fromAddress(),
    to,
    subject: "Your Pantaker sign-in code",
    text: [
      `Your Pantaker sign-in code is ${code}.`,
      "",
      "It expires in 10 minutes. If you did not ask for this code, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1a1a1a;max-width:480px;margin:0 auto;padding:24px">
        <p style="margin:0 0 16px;font-size:14px">Use this code to sign in to Pantaker:</p>
        <p style="margin:0 0 20px;font-size:32px;font-weight:700;letter-spacing:0.25em">${code}</p>
        <p style="margin:0;font-size:14px;color:#555">The code expires in 10 minutes. If you did not ask for it, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendEmailChangeEmail(to: string, confirmUrl: string): Promise<void> {
  await transport().sendMail({
    from: fromAddress(),
    to,
    subject: "Confirm your new Pantaker email",
    text: [
      "Confirm this email address for your Pantaker account:",
      confirmUrl,
      "",
      "The link expires in 30 minutes. If you did not ask for this change, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1a1a1a;max-width:480px;margin:0 auto;padding:24px">
        <p style="margin:0 0 16px;font-size:14px">Confirm this email address for your Pantaker account.</p>
        <p style="margin:0 0 24px">
          <a href="${confirmUrl}" style="display:inline-block;border-radius:999px;background:#1a1a1a;color:#fff;padding:12px 20px;text-decoration:none;font-size:14px">Confirm email</a>
        </p>
        <p style="margin:0;font-size:14px;color:#555">The link expires in 30 minutes. If you did not ask for this change, you can ignore this email.</p>
      </div>
    `,
  });
}
