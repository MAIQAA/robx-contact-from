import express, { Request, Response } from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import rateLimit from "express-rate-limit";
import sanitizeHtml from "sanitize-html";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/contact", limiter);

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: "Gmail", // Replace with your SMTP service if needed
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Define the request body interface
interface ContactFormFields {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  honeypot?: string;
}

// API endpoint to send email
app.post(
  "/api/contact",
  async (req: Request<object, object, ContactFormFields>, res: Response) => {
    const { name, email, phone, subject, message, honeypot } = req.body;

    // Check honeypot for spam
    if (honeypot) {
      return res.status(400).json({ message: "Spam detected." });
    }

    // Validate required fields
    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ message: "Name, email, and message are required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // Sanitize inputs
    const sanitizedName = sanitizeHtml(name, {
      allowedTags: [],
      allowedAttributes: {},
    });
    const sanitizedEmail = sanitizeHtml(email, {
      allowedTags: [],
      allowedAttributes: {},
    });
    const sanitizedPhone = phone
      ? sanitizeHtml(phone, { allowedTags: [], allowedAttributes: {} })
      : "";
    const sanitizedSubject = subject
      ? sanitizeHtml(subject, { allowedTags: [], allowedAttributes: {} })
      : "";
    const sanitizedMessage = sanitizeHtml(message, {
      allowedTags: [],
      allowedAttributes: {},
    });

    // Email options
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
      res.status(200).json({ message: "Message sent successfully!" });
      console.log("Email sent successfully!");
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ message: "Failed to send message." });
    }
  }
);

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
