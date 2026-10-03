import { describe, it, expect } from 'vitest';
import { calculateNextMonthlyDate, getFirstOccurrenceDateStr } from '../../src/lib/services/recurring';
import { getDaysDifferenceFromToday, getTodayISTDateString, formatISTDateOnly } from '../../src/lib/date';

describe('Recurring Date Arithmetic & Precision', () => {
  it('strictly preserves the day of the month without weekend or timezone shift (1st Oct -> 1st Nov)', () => {
    // 1st November 2026 is a Sunday. The old logic wrongly shifted it to Monday, 2nd November 2026.
    // The new logic must strictly keep it as 2026-11-01!
    const nextDate = calculateNextMonthlyDate('2026-10-01', 1);
    expect(nextDate).toBe('2026-11-01');

    // And advancing from 1st Nov -> 1st Dec
    const decDate = calculateNextMonthlyDate('2026-11-01', 1);
    expect(decDate).toBe('2026-12-01');

    // And advancing across year boundary 1st Dec -> 1st Jan
    const janDate = calculateNextMonthlyDate('2026-12-01', 1);
    expect(janDate).toBe('2027-01-01');
  });

  it('preserves custom day of month (e.g. 15th stays 15th every month)', () => {
    const nextDate = calculateNextMonthlyDate('2026-03-15', 15);
    expect(nextDate).toBe('2026-04-15');
  });

  it('safely caps to last day of month for months with fewer days (e.g. 31st)', () => {
    // October has 31 days. November has only 30 days.
    const novDate = calculateNextMonthlyDate('2026-10-31', 31);
    expect(novDate).toBe('2026-11-30');

    // November (30 days) to December (31 days) with customDay = 31 restores day 31
    const decDate = calculateNextMonthlyDate('2026-11-30', 31);
    expect(decDate).toBe('2026-12-31');

    // January 31 to February (28 days in non-leap year 2026)
    const febDate = calculateNextMonthlyDate('2026-01-31', 31);
    expect(febDate).toBe('2026-02-28');
  });
});

describe('Confirm Button Activation Date & Review Status', () => {
  it('reports positive days remaining when scheduled occurrence is in the future', () => {
    const todayStr = getTodayISTDateString();
    const [y, m, d] = todayStr.split('-').map(Number);

    // Date 5 days from today
    const futureDateObj = new Date(Date.UTC(y, m - 1, d + 5));
    const futureStr = `${futureDateObj.getUTCFullYear()}-${String(futureDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(futureDateObj.getUTCDate()).padStart(2, '0')}`;

    const diff = getDaysDifferenceFromToday(futureStr);
    expect(diff).toBe(5);
    expect(diff > 0).toBe(true); // Should NOT activate confirm yet
  });

  it('activates confirmation on or after scheduled occurrence date', () => {
    const todayStr = getTodayISTDateString();
    
    // Exactly today: diff = 0
    const diffToday = getDaysDifferenceFromToday(todayStr);
    expect(diffToday).toBe(0);
    expect(diffToday <= 0).toBe(true); // Due for review & confirm active!

    // Past date (e.g. yesterday)
    const [y, m, d] = todayStr.split('-').map(Number);
    const pastDateObj = new Date(Date.UTC(y, m - 1, d - 1));
    const pastStr = `${pastDateObj.getUTCFullYear()}-${String(pastDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(pastDateObj.getUTCDate()).padStart(2, '0')}`;

    const diffPast = getDaysDifferenceFromToday(pastStr);
    expect(diffPast).toBeLessThanOrEqual(0);
    expect(diffPast <= 0).toBe(true); // Still due for review & confirm active!
  });
});
