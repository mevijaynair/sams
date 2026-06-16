// email.js — transactional email via the Resend HTTPS API (no npm dependency).
//
// Config (env):
//   RESEND_API_KEY   your Resend API key (required to actually send)
//   EMAIL_FROM       verified sender, e.g. "SAMS <no-reply@wearefmss.com>"
//   APP_URL          public base URL, e.g. https://wearefmss.com
//
// If RESEND_API_KEY is unset (local dev), emails are logged to the console
// instead of sent, so the reset flow is still testable without a provider.

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'SAMS <onboarding@resend.dev>';
export const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function sendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    console.log(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n[email:dev] ${text || html}\n`);
    return { dev: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Email send failed (${res.status}): ${body}`);
  }
  return res.json();
}

// ── Templates ───────────────────────────────────────────────────────────────
function layout(title, bodyHtml) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#161a26">
    <div style="font-size:20px;font-weight:800;letter-spacing:-.02em;margin-bottom:4px">SAMS</div>
    <div style="font-size:12px;color:#98a0b3;text-transform:uppercase;letter-spacing:.12em;margin-bottom:20px">Sports Academy Management</div>
    <h2 style="font-size:18px;margin:0 0 12px">${title}</h2>
    ${bodyHtml}
    <p style="color:#98a0b3;font-size:12px;margin-top:28px;border-top:1px solid #e8eaf1;padding-top:14px">
      If you weren't expecting this email you can safely ignore it.</p>
  </div>`;
}

function button(url, label) {
  return `<a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;
    padding:12px 22px;border-radius:8px;font-weight:600;margin:8px 0">${label}</a>
    <p style="font-size:12px;color:#5b6275;margin-top:14px;word-break:break-all">Or paste this link: ${url}</p>`;
}

export function sendPasswordReset(to, name, url) {
  return sendEmail({
    to,
    subject: 'Reset your SAMS password',
    html: layout('Reset your password',
      `<p>Hi ${name || 'there'},</p><p>We received a request to reset your SAMS password.
       This link expires in 1 hour.</p>${button(url, 'Reset password')}`),
    text: `Reset your SAMS password (expires in 1 hour): ${url}`,
  });
}

export function sendInvite(to, name, url) {
  return sendEmail({
    to,
    subject: 'Your SAMS account is ready — set your password',
    html: layout('Welcome to SAMS',
      `<p>Hi ${name || 'there'},</p><p>An account has been created for you.
       Set your password to get started — this link expires in 1 hour.</p>${button(url, 'Set your password')}`),
    text: `Set your SAMS password (expires in 1 hour): ${url}`,
  });
}
