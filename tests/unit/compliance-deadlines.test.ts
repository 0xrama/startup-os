import { describe, expect, it } from "vitest";
import {
  calendarYearFilingDeadline,
  isFederalFilingHoliday,
  rollFederalDeadline,
} from "@/modules/compliance/deadlines";
import { currentFilingTaxYear } from "@/lib/tax-copilot";

describe("calendarYearFilingDeadline", () => {
  it("returns April 15 when it lands on a weekday", () => {
    expect(calendarYearFilingDeadline(2025, 4)).toBe("2026-04-15");
  });

  it("rolls a Sunday deadline past Monday Emancipation Day to Tuesday", () => {
    // April 15, 2029 is a Sunday; April 16 is DC Emancipation Day (Monday),
    // so the federal deadline lands on Tuesday April 17.
    expect(calendarYearFilingDeadline(2028, 4)).toBe("2029-04-17");
  });

  it("rolls a Saturday deadline past observed Emancipation Day", () => {
    // April 15, 2023 was a Saturday; Emancipation Day was observed Monday
    // April 17, so Tax Day 2023 was Tuesday April 18.
    expect(calendarYearFilingDeadline(2022, 4)).toBe("2023-04-18");
  });

  it("keeps April 15 when Emancipation Day falls after it", () => {
    // April 15, 2024 was a Monday and Emancipation Day fell on Tuesday
    // April 16, so the 2024 deadline stayed April 15.
    expect(calendarYearFilingDeadline(2023, 4)).toBe("2024-04-15");
  });
});

describe("isFederalFilingHoliday", () => {
  it("recognizes fixed-date holidays", () => {
    expect(isFederalFilingHoliday(new Date("2026-01-01T00:00:00Z"))).toBe(true);
    expect(isFederalFilingHoliday(new Date("2026-12-25T00:00:00Z"))).toBe(true);
  });

  it("recognizes floating holidays", () => {
    // Thanksgiving 2026: fourth Thursday of November.
    expect(isFederalFilingHoliday(new Date("2026-11-26T00:00:00Z"))).toBe(true);
    // Memorial Day 2026: last Monday of May.
    expect(isFederalFilingHoliday(new Date("2026-05-25T00:00:00Z"))).toBe(true);
  });

  it("does not treat ordinary days as holidays", () => {
    expect(isFederalFilingHoliday(new Date("2026-09-15T00:00:00Z"))).toBe(
      false
    );
  });
});

describe("rollFederalDeadline", () => {
  it("moves weekend dates to the next business day", () => {
    // March 15, 2026 is a Sunday.
    expect(rollFederalDeadline(new Date("2026-03-15T12:00:00Z"))).toBe(
      "2026-03-16"
    );
  });
});

describe("currentFilingTaxYear", () => {
  it("keeps the return due today until the entire UTC day has passed", () => {
    expect(currentFilingTaxYear(new Date("2026-04-15T23:59:59.999Z"))).toBe(
      2025
    );
    expect(currentFilingTaxYear(new Date("2026-04-16T00:00:00Z"))).toBe(2026);
  });
  it("points at last year's return before the April deadline", () => {
    expect(currentFilingTaxYear(new Date("2026-02-10T12:00:00Z"))).toBe(2025);
  });

  it("points at the current year's return after the April deadline", () => {
    expect(currentFilingTaxYear(new Date("2026-09-15T12:00:00Z"))).toBe(2026);
  });

  it("produces a future deadline for the returned tax year", () => {
    const now = new Date("2026-09-15T12:00:00Z");
    const taxYear = currentFilingTaxYear(now);
    expect(
      new Date(`${calendarYearFilingDeadline(taxYear, 4)}T00:00:00Z`) > now
    ).toBe(true);
  });
});
