import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// All app email (invites, password resets, notifications) goes through one
// SMTP configuration. When it's missing, the UI falls back to copyable links.
export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

let transporter: Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }
  return transporter;
}

export async function sendEmail(message: { to: string; subject: string; text: string; html: string }) {
  await getTransporter().sendMail({ from: process.env.SMTP_FROM, ...message });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function actionEmail(opts: { heading: string; body: string; buttonLabel: string; url: string; footer: string }) {
  const html = `<!doctype html>
<html><body style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#18181b">
  <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <tr><td>
      <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(opts.heading)}</h1>
      <p style="font-size:15px;line-height:1.5;margin:0 0 24px">${escapeHtml(opts.body)}</p>
      <a href="${escapeHtml(opts.url)}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px">${escapeHtml(opts.buttonLabel)}</a>
      <p style="font-size:13px;color:#71717a;line-height:1.5;margin:24px 0 0">${escapeHtml(opts.footer)}<br>${escapeHtml(opts.url)}</p>
    </td></tr>
  </table>
</body></html>`;
  const text = `${opts.heading}\n\n${opts.body}\n\n${opts.buttonLabel}: ${opts.url}\n\n${opts.footer}`;
  return { html, text };
}
