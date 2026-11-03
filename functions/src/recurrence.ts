/**
 * Pure recurrence logic — intentionally free of Firebase imports so it is
 * unit-testable with Node's test runner and reused by the scheduled function.
 */

export type RecurrenceKind = "monthly";

export interface RecurrenceRule {
  id: string;
  groupId: string;
  kind: RecurrenceKind;
  /** Calendar day the recurrence is anchored to (YYYY-MM-DD). */
  anchorDate: string;
  timezone?: string;
  paused?: boolean;
  /** Inclusive last date to generate occurrences for. */
  endDate?: string;
  /** Ms of last successful generation (for backfill/skip). */
  lastFiredAt?: number | null;
}

export interface DueOccurrence {
  date: string; // YYYY-MM-DD instance date
  id: string; // "recurrenceId_YYYY-MM-DD" — deterministically unique per rule+date
}

/** Valid idempotency key: `ruleId_YYYY-MM-DD`. */
export function occurrenceId(ruleId: string, date: string): string {
  return `${ruleId}_${date}`;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Advance a date by whole months, clamped to the destination month length. */
export function addMonths(iso: string, months: number): string {
  const d = parseISODate(iso);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toISODate(target);
}

/** Nth occurrence date from the anchor (index 0 = anchor month). */
export function nthOccurrence(rule: RecurrenceRule, index: number): string {
  return addMonths(rule.anchorDate, index);
}

export const MIN_OCCURRENCES = 1;

/**
 * Compute the occurrences a rule still owes up to `today`.
 *
 * Idempotent by construction: each occurrence carries a deterministic id
 * (`ruleId_YYYY-MM-DD`), so retries/multiple partners never create duplicates —
 * a write of the same id is a no-op by Firestore set-with-merge semantics.
 */
export function dueOccurrences(
  rule: RecurrenceRule,
  today: string,
  opts?: { indexStart?: number }
): DueOccurrence[] {
  if (rule.paused) return [];

  const startIndex = opts?.indexStart ?? 0;
  const out: DueOccurrence[] = [];
  const guard = 1200; // safety cap

  for (let index = startIndex; index < guard; index++) {
    const date = nthOccurrence(rule, index);
    if (date > today) break;
    if (rule.endDate && date > rule.endDate) break;
    out.push({ date, id: occurrenceId(rule.id, date) });
  }
  return out;
}