/**
 * Unit tests for the pure recurrence logic (no emulator needed).
 */
const test = require("node:test");
const assert = require("node:assert");
const { dueOccurrences, occurrenceId, addMonths, nthOccurrence } = require("../lib/recurrence");

const baseRule = {
  id: "rent",
  groupId: "group_alice_bob",
  kind: "monthly",
  anchorDate: "2026-01-31",
  paused: false,
  lastFiredAt: null,
};

test("occurrenceId is deterministic per rule+date", () => {
  assert.strictEqual(occurrenceId("rent", "2026-02-28"), "rent_2026-02-28");
  assert.strictEqual(occurrenceId("rent", "2026-02-28"), occurrenceId("rent", "2026-02-28"));
});

test("addMonths clamps to month-end for the 31st", () => {
  assert.strictEqual(addMonths("2026-01-31", 1), "2026-02-28");
  assert.strictEqual(addMonths("2026-01-31", 2), "2026-03-31");
});

test("dueOccurrences generates consecutive monthly instances up to today (idempotent ids)", () => {
  const rule = { ...baseRule, anchorDate: "2026-01-15" };
  const today = "2026-03-15"; // include the current-month occurrence
  const occ = dueOccurrences(rule, today);
  assert.deepStrictEqual(
    occ.map((o) => o.date),
    ["2026-01-15", "2026-02-15", "2026-03-15"]
  );
  // ids unique per date
  const ids = new Set(occ.map((o) => o.id));
  assert.strictEqual(ids.size, occ.length);
});

test("paused rules generate nothing", () => {
  const occ = dueOccurrences({ ...baseRule, anchorDate: "2026-01-15", paused: true }, "2026-03-01");
  assert.strictEqual(occ.length, 0);
});

test("endDate caps generated occurrences", () => {
  const rule = { ...baseRule, anchorDate: "2026-01-15", endDate: "2026-02-10" };
  const occ = dueOccurrences(rule, "2026-06-01");
  // 2026-02-15 is after endDate -> excluded
  assert.deepStrictEqual(occ.map((o) => o.date), ["2026-01-15"]);
});

test("indexStart skips already-materialized occurrences", () => {
  const rule = { ...baseRule, anchorDate: "2026-01-15" };
  const occ = dueOccurrences(rule, "2026-03-15", { indexStart: 2 });
  assert.deepStrictEqual(occ.map((o) => o.date), ["2026-03-15"]);
});

test("nthOccurrence mirrors anchor month index", () => {
  assert.strictEqual(nthOccurrence({ ...baseRule, anchorDate: "2026-01-15" }, 0), "2026-01-15");
  assert.strictEqual(nthOccurrence({ ...baseRule, anchorDate: "2026-01-15" }, 1), "2026-02-15");
});