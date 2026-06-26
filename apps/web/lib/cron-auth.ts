import crypto from "node:crypto";

export interface CronAuthResult {
  valid: boolean;
  error?: string;
  status: number;
}

export function validateCronSecret(authHeader: string | null): CronAuthResult {
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.trim() === "") {
    return {
      valid: false,
      error: "CRON_SECRET is not configured.",
      status: 500,
    };
  }

  if (!authHeader) {
    return { valid: false, error: "Unauthorized", status: 401 };
  }

  const expected = `Bearer ${process.env.CRON_SECRET}`;

  try {
    if (authHeader.length !== expected.length) {
      return { valid: false, error: "Unauthorized", status: 401 };
    }
    if (!crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))) {
      return { valid: false, error: "Unauthorized", status: 401 };
    }
  } catch {
    return { valid: false, error: "Unauthorized", status: 401 };
  }

  return { valid: true, status: 200 };
}
