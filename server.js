const path = require("path");
const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;

const trimValue = value => (value || "").toString().trim();
const normalizeOrigin = origin => trimValue(origin).replace(/\/$/, "");

const allowedOrigins = Array.from(
  new Set(
    [
      process.env.SITE_URL,
      process.env.FRONTEND_ORIGIN,
      ...(process.env.FRONTEND_ORIGINS || "").split(","),
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5500",
      "http://127.0.0.1:5500"
    ]
      .map(normalizeOrigin)
      .filter(Boolean)
  )
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
        return callback(null, true);
      }

      return callback(new Error("This origin is not allowed to access the API."));
    }
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const createTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
};

const transporter = createTransporter();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error("Only PDF, DOC, and DOCX files are allowed."));
    }
    cb(null, true);
  }
});

const getRecipientByType = type => {
  if (type === "career") {
    return process.env.CAREERS_EMAIL || process.env.ADMIN_EMAIL;
  }
  if (type === "quote") {
    return process.env.QUOTE_EMAIL || process.env.ADMIN_EMAIL;
  }
  return process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL;
};

const adminToken = () => trimValue(process.env.ADMIN_TOKEN);

const requireAdminToken = (req, res, next) => {
  const suppliedToken = trimValue(
    req.headers["x-admin-token"] || req.query.token || ""
  );

  if (!adminToken() || suppliedToken !== adminToken()) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  next();
};

const validateCommon = payload => {
  const fullName = trimValue(payload.fullName);
  const email = trimValue(payload.email);
  const phone = trimValue(payload.phone);
  const message = trimValue(payload.message);

  if (!fullName || !email || !phone || !message) {
    return "Please complete all required fields.";
  }

  return "";
};

const ensureMailer = () => {
  if (!transporter) {
    throw new Error(
      "SMTP is not configured yet. Add your mail settings in Render environment variables."
    );
  }
};

const buildEmailText = submission => {
  return [
    `Submission Type: ${submission.type}`,
    `Full Name: ${submission.full_name}`,
    `Company Name: ${submission.company_name || "Not provided"}`,
    `Email: ${submission.email}`,
    `Phone: ${submission.phone}`,
    `Inquiry Type: ${submission.inquiry_type || "Not provided"}`,
    `Product: ${submission.product || "Not provided"}`,
    `Quantity: ${submission.quantity || "Not provided"}`,
    `Destination: ${submission.destination || "Not provided"}`,
    `Timeline: ${submission.timeline || "Not provided"}`,
    `Location: ${submission.location || "Not provided"}`,
    `Role: ${submission.role || "Not provided"}`,
    `Source Page: ${submission.source_page || "Not provided"}`,
    "",
    "Message:",
    submission.message
  ].join("\n");
};

const buildSubmissionRecord = payload => ({
  type: payload.type,
  full_name: trimValue(payload.fullName),
  company_name: trimValue(payload.companyName),
  email: trimValue(payload.email),
  phone: trimValue(payload.phone),
  subject: trimValue(payload.subject),
  product: trimValue(payload.product),
  quantity: trimValue(payload.quantity),
  destination: trimValue(payload.destination),
  timeline: trimValue(payload.timeline),
  inquiry_type: trimValue(payload.inquiryType),
  location: trimValue(payload.location),
  role: trimValue(payload.role),
  message: trimValue(payload.message),
  source_page: trimValue(payload.sourcePage),
  created_at: new Date().toISOString()
});

const sendSubmissionEmail = async (submission, file) => {
  ensureMailer();

  const recipient = getRecipientByType(submission.type);
  if (!recipient) {
    throw new Error("Recipient email is not configured.");
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: recipient,
    replyTo: submission.email,
    subject: submission.subject,
    text: buildEmailText(submission)
  };

  if (file?.buffer?.length) {
    mailOptions.attachments = [
      {
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype
      }
    ];
  }

  await transporter.sendMail(mailOptions);
};

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "A & B Success Agro Ltd Backend",
    time: new Date().toISOString(),
    smtpConfigured: Boolean(transporter),
    allowedOrigins
  });
});

app.post("/api/contact", async (req, res, next) => {
  try {
    const error = validateCommon(req.body);
    if (error) {
      return res.status(400).json({ ok: false, message: error });
    }

    const submission = buildSubmissionRecord({
      ...req.body,
      type: "contact",
      subject: "New Contact Inquiry",
      sourcePage: "contact.html"
    });

    await sendSubmissionEmail(submission);

    return res.status(201).json({
      ok: true,
      message: "Your message has been sent to our email successfully."
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/quotes", async (req, res, next) => {
  try {
    const commonError = validateCommon(req.body);
    if (commonError) {
      return res.status(400).json({ ok: false, message: commonError });
    }

    if (!trimValue(req.body.product) || !trimValue(req.body.quantity)) {
      return res.status(400).json({
        ok: false,
        message: "Product and quantity are required for quote requests."
      });
    }

    const submission = buildSubmissionRecord({
      ...req.body,
      type: "quote",
      subject: "New Quote Request",
      sourcePage: "request-quote.html"
    });

    await sendSubmissionEmail(submission);

    return res.status(201).json({
      ok: true,
      message: "Your quote request has been sent to our email successfully."
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/careers", upload.single("cvFile"), async (req, res, next) => {
  try {
    const commonError = validateCommon(req.body);
    if (commonError) {
      return res.status(400).json({ ok: false, message: commonError });
    }

    if (!trimValue(req.body.role) || !trimValue(req.body.location)) {
      return res.status(400).json({
        ok: false,
        message: "Role of interest and location are required for applications."
      });
    }

    const submission = buildSubmissionRecord({
      ...req.body,
      type: "career",
      subject: `Career Application - ${trimValue(req.body.role) || "General"}`,
      sourcePage: "careers.html"
    });

    await sendSubmissionEmail(submission, req.file || null);

    return res.status(201).json({
      ok: true,
      message: "Your application has been sent to our email successfully."
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/admin/submissions", requireAdminToken, (_req, res) => {
  res.json({
    ok: true,
    submissions: [],
    message: "Email-only mode is active. Submissions are sent to email and not stored in a database."
  });
});

app.get("/api/admin/submissions/:id/file", requireAdminToken, (_req, res) => {
  res.status(404).json({
    ok: false,
    message: "Email-only mode is active. Uploaded files are delivered by email and not stored for dashboard download."
  });
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(rootDir, "admin.html"));
});

app.use(express.static(rootDir, { extensions: ["html"] }));

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error instanceof multer.MulterError) {
    return res.status(400).json({ ok: false, message: error.message });
  }

  return res.status(500).json({
    ok: false,
    message: error.message || "Something went wrong on the server."
  });
});

app.listen(port, () => {
  console.log(`A & B Success Agro backend running at http://localhost:${port}`);
});
