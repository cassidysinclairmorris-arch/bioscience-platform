import nodemailer from "nodemailer";
import type { ClientRole } from "./db";

// Brand values are derived from the established Linkwright brand used across the
// marketing site (red #E30000, near-black #0A0A0A, white). The white wordmark
// asset sits on a dark header bar so it reads clearly in email clients.
const RED = "#E30000";
const BLACK = "#0A0A0A";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

const ROLE_LABEL: Record<ClientRole, string> = {
  owner: "Owner",
  administrator: "Administrator",
  user: "User",
};

function buildHtml(firstName: string, paragraphs: string[], ctaLabel: string, link: string, baseUrl: string): string {
  const logo = `${baseUrl}/linkwright-logo-white.png`;
  const body = paragraphs
    .map(p => `<p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#444444;">${p}</p>`)
    .join("");
  return `
  <div style="margin:0;padding:0;background:#F5F5F5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:32px 0;font-family:Helvetica,Arial,sans-serif;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:92%;background:#FFFFFF;border-radius:16px;overflow:hidden;">
          <tr><td style="background:${BLACK};padding:28px 40px;" align="left">
            <img src="${logo}" alt="Linkwright" height="22" style="height:22px;display:block;" />
          </td></tr>
          <tr><td style="padding:40px 40px 8px;">
            <p style="margin:0 0 20px;font-size:18px;color:${BLACK};font-weight:400;">Hi ${firstName},</p>
            ${body}
            <a href="${link}" style="display:inline-block;margin-top:10px;background:${RED};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.04em;padding:14px 28px;border-radius:999px;">${ctaLabel}</a>
          </td></tr>
          <tr><td style="padding:32px 40px 36px;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#999999;">If the button does not work, copy and paste this link into your browser:<br /><span style="color:#666666;">${link}</span></p>
          </td></tr>
          <tr><td style="border-top:1px solid #E5E5E5;padding:20px 40px;" align="center">
            <p style="margin:0;font-size:12px;color:#999999;">linkwrightstudio.com</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// Welcome / invite email, worded per role (Email 1 owner, 2 administrator, 3 user).
// Also used for password resets, which reuse the role's welcome template.
export async function sendWelcomeEmail(opts: {
  to: string;
  firstName: string;
  role: ClientRole;
  companyName: string;
  link: string;
  baseUrl: string;
}): Promise<void> {
  if (!isEmailConfigured()) throw new Error("Email service is not configured.");

  const company = opts.companyName || "your company";
  // The first and last sentences are their own paragraphs; the middle sits between.
  let subject: string;
  let paragraphs: string[];

  if (opts.role === "owner") {
    subject = "You've been invited to Linkwright";
    paragraphs = [
      "Your Linkwright client portal is ready.",
      "Inside you'll find your content approval queue, published post history, performance reports, and a direct line to your Linkwright team. As the account owner you can also approve posts and manage your team's access.",
      "Click below to set your password and get started.",
    ];
  } else if (opts.role === "administrator") {
    subject = `You've been added to ${company} on Linkwright`;
    paragraphs = [
      `You've been added to ${company}'s Linkwright portal as an Administrator.`,
      "Inside you'll find your content approval queue, published post history, and performance reports. As an administrator you can approve posts and manage your team.",
      "Click below to set your password and get started.",
    ];
  } else {
    subject = `You've been added to ${company} on Linkwright`;
    paragraphs = [
      `You've been added to ${company}'s Linkwright portal.`,
      "Inside you'll find your company's content queue, post history, and performance reports.",
      "Click below to set your password and get started.",
    ];
  }

  await transporter().sendMail({
    from: `"Linkwright" <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject,
    html: buildHtml(opts.firstName, paragraphs, "Set Your Password", opts.link, opts.baseUrl),
  });
}

// Email 4: role change notification (no password reset).
export async function sendRoleChangeEmail(opts: {
  to: string;
  firstName: string;
  companyName: string;
  newRole: ClientRole;
  baseUrl: string;
}): Promise<void> {
  if (!isEmailConfigured()) throw new Error("Email service is not configured.");
  const company = opts.companyName || "your company";
  const paragraphs = [
    `Your role on ${company}'s Linkwright portal has been updated to ${ROLE_LABEL[opts.newRole]}.`,
    "Log in to access your portal.",
  ];
  await transporter().sendMail({
    from: `"Linkwright" <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject: "Your access has been updated on Linkwright",
    html: buildHtml(opts.firstName, paragraphs, "Go to Portal", `${opts.baseUrl}/client/login`, opts.baseUrl),
  });
}
