/** Validation schemas and OCR response parsing guards. */

import { toMinorUnits } from "./currency";
import { toISODate } from "./dates";

// ---------------------------------------------------------------------------
// Core field validators
// ---------------------------------------------------------------------------

export function isValidTitle(title: string): boolean {
  const t = title.trim();
  return t.length >= 1 && t.length <= 80;
}

export function isNonNegativeNumber(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

export function isValidDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y] = iso.split("-").map(Number);
  return y >= 2000 && y <= 2100;
}

// ---------------------------------------------------------------------------
// OCR response schema (Phase 2.1)
// ---------------------------------------------------------------------------

export interface ReceiptParseResult {
  merchant: string;
  date: string; // YYYY-MM-DD
  total: number; // decimal amount
  category: string;
  type: "expense" | "income";
  currency: string;
  confidence: number; // 0..1
  raw: unknown;
}

const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Utilities",
  "Rent",
  "Entertainment",
  "Healthcare",
  "Travel",
  "Other",
];

const OBVIOUS_MERCHANTS: Record<string, string> = {
  "grab food": "Food",
  "uber": "Transport",
  "grab": "Transport",
  "foodpanda": "Food",
  "shopee": "Shopping",
  "lazada": "Shopping",
  "mcdonald": "Food",
  "kfc": "Food",
};

/**
 * Parse + validate a Gemini OCR JSON response. Returns the parsed receipt or
 * throws a typed error. Low-confidence or invalid fields surface for the user to
 * confirm — the result is NEVER written straight to the ledger.
 */
export function parseReceiptResponse(raw: unknown): ReceiptParseResult {
  if (raw === null || typeof raw !== "object") {
    throw new Error("OCR_RESPONSE_INVALID");
  }
  const obj = raw as Record<string, unknown>;

  const merchantField = obj["merchant"] ?? obj["merchant_name"] ?? obj["store"];
  const dateField = obj["date"] ?? obj["transaction_date"];
  const totalField = obj["total"] ?? obj["total_amount"] ?? obj["amount"];
  const categoryField = obj["category"];
  const typeField = obj["type"];
  const currencyField = obj["currency"];
  const confidenceField = obj["confidence"];

  const merchant = String(merchantField ?? "").trim();
  const total = Number(totalField);
  let date = String(dateField ?? "").trim();

  if (!merchant) throw new Error("OCR_MISSING_MERCHANT");
  if (!Number.isFinite(total)) throw new Error("OCR_MISSING_TOTAL");

  // Normalize a slash or human date to YYYY-MM-DD when possible.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const m = date.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) date = `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    else date = toISODate(new Date());
  }

  const type = typeField === "income" || typeField === "credit" ? "income" : "expense";

  let category = String(categoryField ?? "").trim();
  const normalizedMerchant = merchant.toLowerCase();
  for (const [key, value] of Object.entries(OBVIOUS_MERCHANTS)) {
    if (normalizedMerchant.includes(key)) {
      category = value;
      break;
    }
  }
  if (!category || !CATEGORIES.includes(category)) category = "Other";

  const confidence = Number.isFinite(Number(confidenceField))
    ? clamp01(Number(confidenceField))
    : 0.5;

  return {
    merchant,
    date,
    total: round2(total),
    category,
    type,
    currency: String(currencyField ?? "").trim() || "RM",
    confidence,
    raw,
  };
}

/** True when the parsed result is low-confidence and should require confirmation. */
export function needsReceiptConfirmation(result: ReceiptParseResult): boolean {
  return result.confidence < 0.75;
}

/**
 * Map a `scanReceipt` callable payload into the budget form.
 * The function returns `{ result: { total, ... }, needsConfirmation }`.
 * `total` is the amount; a missing flag still confirms low-confidence parses.
 */
export function callableReceiptToFields(payload: unknown): {
  title: string;
  amount: string;
  category: string;
  date: string;
  type: "expense" | "income";
  needsConfirmation: boolean;
} {
  if (payload === null || typeof payload !== "object") {
    throw new Error("OCR_RESPONSE_INVALID");
  }
  const body = payload as { result?: unknown; needsConfirmation?: unknown };
  const parsed = parseReceiptResponse(body.result);
  return {
    title: parsed.merchant,
    amount: parsed.total.toFixed(2),
    category: parsed.category,
    date: parsed.date,
    type: parsed.type,
    needsConfirmation: body.needsConfirmation === true || needsReceiptConfirmation(parsed),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export { toMinorUnits };
export type { ReceiptParseResult as OcrResult };
