import { isValidTitle, isNonNegativeNumber, parseReceiptResponse, needsReceiptConfirmation, callableReceiptToFields } from "../validation";

describe("validation", () => {
  test("title bounds", () => {
    expect(isValidTitle("Coffee")).toBe(true);
    expect(isValidTitle("   ")).toBe(false);
    expect(isValidTitle("")).toBe(false);
    expect(isValidTitle("x".repeat(81))).toBe(false);
  });

  test("isNonNegativeNumber", () => {
    expect(isNonNegativeNumber(0)).toBe(true);
    expect(isNonNegativeNumber(12.5)).toBe(true);
    expect(isNonNegativeNumber(-1)).toBe(false);
    expect(isNonNegativeNumber(Number.NaN)).toBe(false);
  });

  test("parseReceiptResponse maps and defaults", () => {
    const r = parseReceiptResponse({
      merchant: "Starbucks",
      total: 12.5,
      date: "2026-08-15",
      category: "Unknown thing",
      type: "expense",
      confidence: 0.9,
    });
    expect(r.merchant).toBe("Starbucks");
    expect(r.total).toBe(12.5);
    expect(r.type).toBe("expense");
    expect(r.category).toBe("Other");
    expect(needsReceiptConfirmation(r)).toBe(false);
  });

  test("obvious merchant maps to category", () => {
    const r = parseReceiptResponse({ merchant: "Grab Food", total: 8, confidence: 0.5 });
    expect(r.category).toBe("Food");
    expect(needsReceiptConfirmation(r)).toBe(true);
  });

  test("callable payload reads total and the sibling confirmation flag", () => {
    const fields = callableReceiptToFields({
      result: {
        merchant: "Starbucks",
        total: 12.5,
        date: "2026-08-15",
        category: "Food",
        type: "expense",
        confidence: 0.95,
      },
      needsConfirmation: true,
    });
    expect(fields).toEqual({
      title: "Starbucks",
      amount: "12.50",
      category: "Food",
      date: "2026-08-15",
      type: "expense",
      needsConfirmation: true,
    });
  });

  test("callable payload confirms low confidence when the flag is omitted", () => {
    const fields = callableReceiptToFields({
      result: { merchant: "Grab", total: 8, confidence: 0.2 },
    });
    expect(fields.amount).toBe("8.00");
    expect(fields.needsConfirmation).toBe(true);
  });

  test("rejects missing merchant", () => {
    expect(() => parseReceiptResponse({ total: 5, date: "2026-08-01" })).toThrow();
  });

  test("rejects bad total", () => {
    expect(() => parseReceiptResponse({ merchant: "X", total: "abc", date: "2026-08-01" })).toThrow();
  });
});
