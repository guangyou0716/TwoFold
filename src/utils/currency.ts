/**
 * Monetary handling.
 *
 * The plan requires money to be handled as integer minor units to avoid float
 * rounding (Phase 6). The current schema stores float `amount` values, so these
 * helpers provide a migration-safe bridge: they format for display and convert
 * between minor units and the legacy decimal representation.
 *
 * Prefer integer minor-unit math going forward; write `amountMinor` on new
 * documents and keep `amount` for back-compat until the reader + migration
 * lands in Phase 10.
 */

/** Multiply a decimal into integer minor units (2dp). */
export function toMinorUnits(decimal: number): number {
  return Math.round((decimal + Number.EPSILON) * 100);
}

/** Convert integer minor units back to a display decimal. */
export function fromMinorUnits(minor: number): number {
  return minor / 100;
}

/** Deterministic currency symbol from a preference string. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  "$": "$",
  "€": "€",
  "¥": "¥",
  "RM": "RM",
  "NT$": "NT$",
  "MYR": "RM",
  "USD": "$",
  "EUR": "€",
  "JPY": "¥",
  "CNY": "¥",
};

export function currencySymbol(preference?: string): string {
  if (!preference) return "$";
  return CURRENCY_SYMBOLS[preference] ?? preference;
}

/** Format a decimal amount with a currency symbol and two decimals. */
export function formatAmount(amount: number, currency?: string): string {
  const symbol = currencySymbol(currency);
  const neg = amount < 0;
  const abs = Math.abs(amount);
  return `${neg ? "-" : ""}${symbol}${abs.toFixed(2)}`;
}

/** Format an integer minor-unit amount with a currency symbol. */
export function formatMinor(minor: number, currency?: string): string {
  return formatAmount(fromMinorUnits(minor), currency);
}