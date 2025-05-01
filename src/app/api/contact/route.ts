// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import sanitizeHtml from "sanitize-html";

export async function POST(req: NextRequest) {
  const { name, email, phone, subject, message, honeypot } = await req.json();

  if (honeypot) {
    return NextResponse.json({ message: "Spam detected." }, { status: 400 });
  }

  if (!name || !email || !message) {
    return NextResponse.json(
      { message: "Name, email, and message are required." },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { message: "Invalid email format." },
      { status: 400 }
    );
  }

  const sanitizedName = sanitizeHtml(name);
  const sanitizedEmail = sanitizeHtml(email);
  const sanitizedPhone = phone ? sanitizeHtml(phone) : "";
  const sanitizedSubject = subject ? sanitizeHtml(subject) : "";
  const sanitizedMessage = sanitizeHtml(message);

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"MeMeY Contact" <${process.env.EMAIL_USER}>`,
    to: process.env.RECIPIENT_EMAIL || "info@robx.ai",
    replyTo: sanitizedEmail,
    subject:
      sanitizedSubject || `New Contact Form Submission from ${sanitizedName}`,
    text: `
      Name: ${sanitizedName}
      Email: ${sanitizedEmail}
      ${phone ? `Phone: ${sanitizedPhone}` : ""}
      ${subject ? `Subject: ${sanitizedSubject}` : ""}
      Message: ${sanitizedMessage}
    `,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${sanitizedName}</p>
      <p><strong>Email:</strong> ${sanitizedEmail}</p>
      ${phone ? `<p><strong>Phone:</strong> ${sanitizedPhone}</p>` : ""}
      ${subject ? `<p><strong>Subject:</strong> ${sanitizedSubject}</p>` : ""}
      <p><strong>Message:</strong> ${sanitizedMessage}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return NextResponse.json({ message: "Message sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { message: "Failed to send message." },
      { status: 500 }
    );
  }
}
