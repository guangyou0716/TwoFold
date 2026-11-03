/**
 * Schema-versioning + migration helpers (Phase 10).
 *
 * Documents carry a top-level `schemaVersion` so future shape changes stay
 * explicit. The migration runner is a small, idempotent, per-document registry:
 * it runs pending migrations for a snapshot and reports the new version. It is
 * never invoked from render — call it from event handlers/effects.
 */

export const SCHEMA_VERSION = 1;

/** Latest known schema version — bump alongside a new migration. */
export const LATEST_SCHEMA_VERSION = 1;

export type Migration<T extends Record<string, unknown> = Record<string, unknown>> = {
  from: number;
  to: number;
  /** Mutates `doc` in place and returns it. Must be idempotent. */
  apply: (doc: T) => T;
};

const migrations = new Map<string, Migration>();

export function registerMigration<D extends Record<string, unknown>>(
  m: Migration<D>
): void {
  migrations.set(`${m.from}->${m.to}`, m as Migration);
}

export function schemaVersionOf(doc: Record<string, unknown> | null | undefined): number {
  return typeof doc?.schemaVersion === "number" ? (doc.schemaVersion as number) : 0;
}

/**
 * Run all registered migrations on the document, idempotently, until it
 * reaches LATEST_SCHEMA_VERSION. Mutates and returns a new document object of
 * the migrated data (spread-copy, never mutates the input directly).
 */
export function migrateDocument<D extends Record<string, unknown>>(
  doc: D
): { data: D; migrationsApplied: number } {
  let current = { ...doc, schemaVersion: schemaVersionOf(doc) } as D;
  let count = 0;
  let guard = 0;

  while (schemaVersionOf(current) < LATEST_SCHEMA_VERSION) {
    const from = schemaVersionOf(current);
    const next = migrations.get(`${from}->${from + 1}`);
    if (!next) {
      // No migration for the next step; stop silently rather than loop forever.
      break;
    }
    current = next.apply({ ...current }) as D;
    count++;
    guard++;
    if (guard > 100) throw new Error("Migration runaway loop");
  }

  return { data: current, migrationsApplied: count };
}

// ---------------------------------------------------------------------------
// Compat readers for pre-versioned documents
// ---------------------------------------------------------------------------

/** Legacy `amount` stores floats; prefer `amountMinor` going forward. */
export function transactionAmountMinor(
  doc: Record<string, unknown>
): number | null {
  const minor = doc.amountMinor;
  if (typeof minor === "number" && Number.isFinite(minor)) return minor;
  const amount = doc.amount;
  if (typeof amount === "number" && Number.isFinite(amount)) {
    return Math.round(amount * 100);
  }
  return null;
}

/** Legacy `dueDate` (YYYY-MM-DD) vs newer `dueAt` (ISO); return the better one. */
export function taskDue(doc: Record<string, unknown>): string | null {
  const dueAt = doc.dueAt;
  if (typeof dueAt === "string") return dueAt;
  const dueDate = doc.dueDate;
  return typeof dueDate === "string" ? dueDate : null;
}

export default migrateDocument;