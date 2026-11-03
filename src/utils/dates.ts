/** Date/time utilities shared across the app. All local-agnostic helpers. */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local date → YYYY-MM-DD. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Date part of a Date → YYYY-MM-DD. */
export function todayISODate(): string {
  return toISODate(new Date());
}

/** Parse YYYY-MM-DD to a local Date at midnight (no TZ drift). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Difference in whole calendar-ish days from `a` to `b` (b - a). */
export function daysBetween(a: string, b: string): number {
  const da = parseISODate(a).getTime();
  const db = parseISODate(b).getTime();
  return Math.round((db - da) / DAY_MS);
}

/** True when `iso` is today or in the past (compared to today). */
export function isDueOrOverdue(iso: string): boolean {
  return iso <= todayISODate();
}

/** Friendly countdown label ("in 3 days" / "today" / "overdue"). */
export function countdownLabel(iso: string, now = todayISODate()): string {
  const diff = daysBetween(now, iso);
  if (diff < 0) return `overdue by ${-diff}`;
  if (diff === 0) return "today";
  if (diff === 1) return "in 1 day";
  return `in ${diff} days`;
}

/** Advance a date by a whole number of months, clamped to month length. */
export function addMonths(iso: string, months: number): string {
  const d = parseISODate(iso);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toISODate(target);
}