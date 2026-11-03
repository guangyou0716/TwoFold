import {
  toMinorUnits,
  fromMinorUnits,
  currencySymbol,
  formatAmount,
  formatMinor,
} from "../currency";

describe("currency helpers", () => {
  test("toMinorUnits avoids float drift", () => {
    expect(toMinorUnits(10.1)).toBe(1010);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30); // 0.30000000000000004 -> 30
  });

  test("fromMinorUnits round-trips", () => {
    expect(fromMinorUnits(1234)).toBe(12.34);
  });

  test("currencySymbol maps known + falls back to raw", () => {
    expect(currencySymbol("RM")).toBe("RM");
    expect(currencySymbol("MYR")).toBe("RM");
    expect(currencySymbol("$")).toBe("$");
    expect(currencySymbol("XYZ")).toBe("XYZ");
    expect(currencySymbol(undefined)).toBe("$");
  });

  test("formatAmount renders sign + two decimals", () => {
    expect(formatAmount(12.5, "RM")).toBe("RM12.50");
    expect(formatAmount(-3, "RM")).toBe("-RM3.00");
  });

  test("formatMinor uses integer minor units", () => {
    expect(formatMinor(1050, "$")).toBe("$10.50");
  });
});