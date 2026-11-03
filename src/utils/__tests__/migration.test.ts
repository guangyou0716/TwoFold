import { SCHEMA_VERSION, LATEST_SCHEMA_VERSION, registerMigration, migrateDocument, schemaVersionOf, transactionAmountMinor, taskDue } from "../migration";

registerMigration<Record<string, unknown>>({
  from: 0,
  to: 1,
  apply: (doc) => {
    // v1: introduce schemaVersion + normalize amount to amountMinor.
    const minor = transactionAmountMinor(doc);
    return {
      ...doc,
      schemaVersion: 1,
      ...(minor !== null ? { amountMinor: minor } : {}),
    };
  },
});

describe("schema migration", () => {
  test("legacy unversioned doc migrates to v1", () => {
    const { data, migrationsApplied } = migrateDocument<Record<string, unknown>>({
      title: "Rent",
      amount: 1200.5,
    });
    expect(migrationsApplied).toBe(1);
    expect(schemaVersionOf(data)).toBe(1);
    expect(data.amountMinor).toBe(120050);
  });

  test("already-current doc is untouched", () => {
    const { data, migrationsApplied } = migrateDocument({ schemaVersion: 1, amountMinor: 5 });
    expect(migrationsApplied).toBe(0);
    expect(schemaVersionOf(data)).toBe(1);
  });

  test("migration is idempotent (does not re-apply)", () => {
    const first = migrateDocument<Record<string, unknown>>({ title: "X", amount: 1.1 }).data;
    const second = migrateDocument(first);
    expect(second.migrationsApplied).toBe(0);
    expect(second.data.amountMinor).toBe(110);
  });

  test("transactionAmountMinor prefers amountMinor, falls back to amount", () => {
    expect(transactionAmountMinor({ amountMinor: 999, amount: 1 })).toBe(999);
    expect(transactionAmountMinor({ amount: 12.34 })).toBe(1234);
    expect(transactionAmountMinor({})).toBeNull();
  });

  test("taskDue prefers dueAt, then dueDate", () => {
    expect(taskDue({ dueAt: "2026-08-01T00:00:00Z", dueDate: "2026-08-02" })).toBe("2026-08-01T00:00:00Z");
    expect(taskDue({ dueDate: "2026-08-02" })).toBe("2026-08-02");
    expect(taskDue({})).toBeNull();
  });

  test("SCHEMA_VERSION matches LATEST", () => {
    expect(SCHEMA_VERSION).toBe(LATEST_SCHEMA_VERSION);
  });
});