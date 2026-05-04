import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { name, email, linkedin, goals } = await req.json();

  if (!name || !email || !goals) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Linkwright Contact Form" <${process.env.SMTP_USER}>`,
    to: "info@linkwrightstudio.com",
    replyTo: email,
    subject: `New enquiry from ${name}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; color: #1A1814;">
        <h2 style="font-weight: 300; font-style: italic; font-size: 28px; margin-bottom: 24px;">New enquiry via linkwrightstudio.com</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 10px 0; border-bottom: 0.5px solid #ddd; color: #8A8680; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; width: 140px;">Name</td><td style="padding: 10px 0; border-bottom: 0.5px solid #ddd;">${name}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 0.5px solid #ddd; color: #8A8680; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">Email</td><td style="padding: 10px 0; border-bottom: 0.5px solid #ddd;"><a href="mailto:${email}" style="color: #C9A84C;">${email}</a></td></tr>
          ${linkedin ? `<tr><td style="padding: 10px 0; border-bottom: 0.5px solid #ddd; color: #8A8680; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">LinkedIn</td><td style="padding: 10px 0; border-bottom: 0.5px solid #ddd;"><a href="${linkedin}" style="color: #C9A84C;">${linkedin}</a></td></tr>` : ""}
          <tr><td style="padding: 10px 0; color: #8A8680; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; vertical-align: top;">Goals</td><td style="padding: 10px 0; line-height: 1.7;">${goals.replace(/\n/g, "<br>")}</td></tr>
        </table>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
