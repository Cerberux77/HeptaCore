export interface CronWindow {
  windowStart: string;
  windowEnd: string;
}

export function computeWindow(now: Date, windowMinutes: number = 60): CronWindow {
  const ms = now.getTime();
  const windowMs = windowMinutes * 60 * 1000;
  const windowStartMs = Math.floor(ms / windowMs) * windowMs;
  return {
    windowStart: new Date(windowStartMs).toISOString(),
    windowEnd: new Date(windowStartMs + windowMs).toISOString(),
  };
}

export type JobTimeClassification = "future" | "currentWindow" | "backlog";

export function classifyJob(scheduledFor: Date, now: Date): JobTimeClassification {
  if (isNaN(scheduledFor.getTime())) {
    return "future";
  }
  if (scheduledFor.getTime() > now.getTime()) {
    return "future";
  }
  const window = computeWindow(now);
  const windowStartMs = new Date(window.windowStart).getTime();
  if (scheduledFor.getTime() >= windowStartMs) {
    return "currentWindow";
  }
  return "backlog";
}

export function isBeforeOrEqual(a: Date, b: Date): boolean {
  return a.getTime() <= b.getTime();
}

export function generateRunId(): string {
  const ts = Date.now().toString(36);
  const rand = crypto.randomUUID().slice(0, 8);
  return `cron_${ts}_${rand}`;
}

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const d = new Date(value);
  return !isNaN(d.getTime()) && value === d.toISOString();
}
