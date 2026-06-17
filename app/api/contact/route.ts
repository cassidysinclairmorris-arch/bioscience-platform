import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; company?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { name, email, company, message } = body ?? {};

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Please provide your name, email, and a message." },
      { status: 400 }
    );
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json(
      { error: "Email service is not configured yet." },
      { status: 500 }
    );
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

  try {
    await transporter.sendMail({
      from: `"Linkwright Contact Form" <${process.env.SMTP_USER}>`,
      to: "cassidy@linkwrightstudio.com",
      replyTo: email,
      subject: `New enquiry from ${name}`,
      html: `
        <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; color: #0A0A0A;">
          <h2 style="font-weight: 400; font-size: 22px; margin-bottom: 24px;">New enquiry via linkwrightstudio.com</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #E5E5E5; color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; width: 140px;">Name</td><td style="padding: 10px 0; border-bottom: 1px solid #E5E5E5;">${name}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #E5E5E5; color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">Email</td><td style="padding: 10px 0; border-bottom: 1px solid #E5E5E5;"><a href="mailto:${email}" style="color: #E30000;">${email}</a></td></tr>
            ${company ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #E5E5E5; color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">Company</td><td style="padding: 10px 0; border-bottom: 1px solid #E5E5E5;">${company}</td></tr>` : ""}
            <tr><td style="padding: 10px 0; color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; vertical-align: top;">Message</td><td style="padding: 10px 0; line-height: 1.7;">${String(message).replace(/\n/g, "<br>")}</td></tr>
          </table>
        </div>
      `,
    });
  } catch (err) {
    console.error("Contact form email failed:", err);
    return NextResponse.json({ error: "Failed to send message." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
