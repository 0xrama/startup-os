export const COMPLIANCE_RULE_VERSION = "2026-09-14.1";

export const COMPLIANCE_RULE_REVIEW = "unreviewed";

function observed(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month, day));

  if (date.getUTCDay() === 6) date.setUTCDate(day - 1);

  if (date.getUTCDay() === 0) date.setUTCDate(day + 1);

  return date.toISOString().slice(0, 10);
}

function nthWeekday(
  year: number,
  month: number,
  weekday: number,
  ordinal: number
) {
  const first = new Date(Date.UTC(year, month, 1));

  return new Date(
    Date.UTC(
      year,
      month,
      1 + ((weekday - first.getUTCDay() + 7) % 7) + 7 * (ordinal - 1)
    )
  )
    .toISOString()
    .slice(0, 10);
}

export function isFederalFilingHoliday(date: Date) {
  const year = date.getUTCFullYear();

  const holidays = [
    observed(year, 0, 1),
    observed(year + 1, 0, 1),
    observed(year, 3, 16),
    observed(year, 6, 4),
    observed(year, 10, 11),
    observed(year, 11, 25),
    nthWeekday(year, 0, 1, 3),
    nthWeekday(year, 1, 1, 3),
    nthWeekday(year, 8, 1, 1),
    nthWeekday(year, 9, 1, 2),
    nthWeekday(year, 10, 4, 4),
  ];

  if (year >= 2021) holidays.push(observed(year, 5, 19));

  const memorialDay = new Date(Date.UTC(year, 4, 31));

  memorialDay.setUTCDate(31 - ((memorialDay.getUTCDay() + 6) % 7));

  holidays.push(memorialDay.toISOString().slice(0, 10));

  return holidays.includes(date.toISOString().slice(0, 10));
}

export function rollFederalDeadline(date: Date) {
  const result = new Date(date);

  while (
    [0, 6].includes(result.getUTCDay()) ||
    isFederalFilingHoliday(result)
  ) {
    result.setUTCDate(result.getUTCDate() + 1);
  }

  return result.toISOString().slice(0, 10);
}

export function calendarYearFilingDeadline(
  taxYear: number,
  monthsAfterYearEnd: number
) {
  return rollFederalDeadline(
    new Date(Date.UTC(taxYear + 1, monthsAfterYearEnd - 1, 15))
  );
}
