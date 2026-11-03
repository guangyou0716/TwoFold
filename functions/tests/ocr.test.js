/**
 * Unit tests for OCR schema parsing (pure logic, no network).
 */
const test = require("node:test");
const assert = require("node:assert");
const { parseOcrResult, needsConfirmation } = require("../lib/ocr");

test("parses a well-formed result", () => {
  const r = parseOcrResult({
    merchant: "Starbucks",
    total: 12.5,
    date: "2026-08-15",
    category: "Food",
    currency: "RM",
    type: "expense",
    confidence: 0.9,
  });
  assert.strictEqual(r.merchant, "Starbucks");
  assert.strictEqual(r.total, 12.5);
  assert.strictEqual(r.date, "2026-08-15");
  assert.strictEqual(r.category, "Food");
  assert.strictEqual(r.type, "expense");
  assert.ok(!needsConfirmation(r));
});

test("parses alternative/ad hoc date + fallback date", () => {
  const r = parseOcrResult({ merchant: "Grab", total: 8, date: "15/08/2026", confidence: 0.5 });
  assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/);
});

test("rejects missing merchant", () => {
  assert.throws(() => parseOcrResult({ total: 5, date: "2026-08-01" }));
});

test("rejects non-numeric total", () => {
  assert.throws(() => parseOcrResult({ merchant: "X", total: "abc", date: "2026-08-01" }));
});

test("low confidence flags confirmation", () => {
  assert.ok(needsConfirmation(parseOcrResult({ merchant: "M", total: 1, confidence: 0.3 })));
});