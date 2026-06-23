export function getEmailConfig() {
  const provider = (process.env.EMAIL_PROVIDER || "disabled") as "disabled" | "resend";
  const resendApiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const from = process.env.EMAIL_FROM || "HeptaCore <noreply@heptacore.vercel.app>";
  const replyTo = process.env.EMAIL_REPLY_TO;
  const appUrl = process.env.HEPTACORE_APP_URL || process.env.VERCEL_URL || "http://localhost:3000";

  if (provider === "resend") {
    if (!resendApiKey) throw new EmailConfigError("RESEND_API_KEY is required when EMAIL_PROVIDER=resend", "MISSING_RESEND_API_KEY");
    if (!from.includes("@")) throw new EmailConfigError("EMAIL_FROM must be a valid email address", "INVALID_EMAIL_FROM");
  }

  return { provider, resendApiKey, webhookSecret, from, replyTo, appUrl };
}

export class EmailConfigError extends Error {
  constructor(message: string, public code: string) { super(message); this.name = "EmailConfigError"; }
}
