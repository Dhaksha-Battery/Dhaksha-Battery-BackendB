// config/mailer.js
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM;
const FROM_NAME = process.env.EMAIL_FROM_NAME || "Battery Log";

if (!API_KEY) {
  throw new Error("Missing SENDGRID_API_KEY in environment");
}
if (!FROM_EMAIL) {
  throw new Error("Missing EMAIL_FROM in environment");
}

sgMail.setApiKey(API_KEY);

/**
 * sendMail
 * @param {Object} opts
 * @param {string} opts.to - recipient email
 * @param {string} opts.subject
 * @param {string} [opts.text]
 * @param {string} [opts.html]
 * @param {string} [opts.from] - optional override
 */
export async function sendMail({ to, subject, text = "", html = "", from }) {
  const msg = {
    to,
    from: from || `${FROM_NAME} <${FROM_EMAIL}>`,
    subject,
    text,
    html,
  };

  // basic retry policy (small exponential backoff)
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // send returns an array of responses; return it for debugging if needed
      const res = await sgMail.send(msg);
      return res;
    } catch (err) {
      const isLast = attempt === maxAttempts;
      console.warn(`sendMail attempt ${attempt} failed:`, err?.message || err);
      // If last attempt, throw error so caller can handle
      if (isLast) {
        // Attach some useful debug info but do NOT include secrets
        const error = new Error("Failed to send email");
        error.original = err?.response?.body || err?.message || err;
        throw error;
      }
      // sleep before retry (exponential backoff)
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }
}