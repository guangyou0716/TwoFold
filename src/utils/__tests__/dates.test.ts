import {
  toISODate,
  todayISODate,
  daysBetween,
  isDueOrOverdue,
  countdownLabel,
  addMonths,
} from "../dates";

describe("date helpers", () => {
  test("toISODate formats local date", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  test("todayISODate matches YYYY-MM-DD", () => {
    expect(todayISODate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("daysBetween counts the gap", () => {
    expect(daysBetween("2026-01-01", "2026-01-04")).toBe(3);
    expect(daysBetween("2026-01-04", "2026-01-01")).toBe(-3);
  });

  test("isDueOrOverdue compares to today", () => {
    expect(isDueOrOverdue("2000-01-01")).toBe(true);
    expect(isDueOrOverdue("2999-01-01")).toBe(false);
  });

  test("countdownLabel returns human labels", () => {
    expect(countdownLabel("2026-01-01", "2026-01-04")).toBe("overdue by 3");
    expect(countdownLabel("2026-01-04", "2026-01-04")).toBe("today");
    expect(countdownLabel("2026-01-05", "2026-01-04")).toBe("in 1 day");
    expect(countdownLabel("2026-01-07", "2026-01-04")).toBe("in 3 days");
  });

  test("addMonths clamps month-end", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-01-15", 1)).toBe("2026-02-15");
  });
});