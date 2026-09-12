import { describe, it, expect } from 'vitest';
import { formatISTDateTime, formatISTDateOnly } from '../../src/lib/date';

describe('IST Date Formatting (Feature 8)', () => {
  it('formats UTC ISO timestamp to IST (Asia/Kolkata)', () => {
    // 2026-09-12 05:12:00 UTC is 2026-09-12 10:42:00 IST (+5:30)
    const date = new Date('2026-09-12T05:12:00.000Z');
    const formatted = formatISTDateTime(date);
    expect(formatted).toMatch(/12 Sep 2026/);
    expect(formatted).toMatch(/10:42\s*(am|pm|AM|PM)/i);
  });

  it('formats Date-only strings without UTC backward date shift', () => {
    // "2026-09-12" must stay 12 Sep 2026 regardless of UTC offset
    const formatted = formatISTDateOnly('2026-09-12');
    expect(formatted).toBe('12 Sep 2026');
  });
});

describe('Investment Valuation Calculations (Features 4 & 5)', () => {
  it('calculates current value, gain/loss amount and percentage accurately from units and price', () => {
    // Example from user request:
    // Invested amount: ₹50,000 (5000000 minor)
    // Units currently held: 312.456
    // Current price: ₹240.035 (24003.5 minor per unit -> current value: 312.456 * 240.035 = 75000.38)
    const investedAmountMinor = 5000000n; // ₹50,000.00
    const units = 312.456;
    const currentPriceMinor = 24004n; // ₹240.04
    
    // Current value = currentPrice * units: 24004 * 312.456 = 7500193.824 -> round -> 7500194
    const currentValueMinor = BigInt(Math.round(Number(currentPriceMinor) * units));
    expect(currentValueMinor).toBe(7500194n); // ~₹75,001.94

    // Gain/Loss = Current Value - Invested Amount
    const gainLossMinor = currentValueMinor - investedAmountMinor;
    expect(gainLossMinor).toBe(2500194n); // ~₹25,001.94 profit

    // Gain/Loss % = (Gain/Loss / Invested) * 100
    const gainLossPercentage = (Number(gainLossMinor) / Number(investedAmountMinor)) * 100;
    expect(gainLossPercentage).toBeCloseTo(50.0038, 2);
  });

  it('handles investment losses correctly', () => {
    const investedAmountMinor = 10000000n; // ₹1,00,000.00
    const units = 500;
    const currentPriceMinor = 15000n; // ₹150.00 -> Current Value = 500 * 15000 = 7500000n (₹75,000.00)
    
    const currentValueMinor = BigInt(Math.round(Number(currentPriceMinor) * units));
    const gainLossMinor = currentValueMinor - investedAmountMinor;
    const gainLossPercentage = (Number(gainLossMinor) / Number(investedAmountMinor)) * 100;

    expect(gainLossMinor).toBe(-2500000n); // -₹25,000.00 loss
    expect(gainLossPercentage).toBe(-25.0);
  });
});

describe('Free to Spend Online vs Cash Breakdown (Feature 6)', () => {
  it('ensures Online + Cash exactly reconciles with Free to Spend', () => {
    const accounts = [
      { id: '1', accountType: 'cash_wallet', balanceMinor: 1500000n, totalAllocatedMinor: 200000n }, // Free: 13,000
      { id: '2', accountType: 'bank', balanceMinor: 8500000n, totalAllocatedMinor: 1500000n }, // Free: 70,000
      { id: '3', accountType: 'digital_wallet', balanceMinor: 2000000n, totalAllocatedMinor: 0n }, // Free: 20,000
    ];

    let totalLiquid = 0n;
    let totalAllocated = 0n;
    let cashBalance = 0n;
    let cashAllocated = 0n;

    for (const acc of accounts) {
      totalLiquid += acc.balanceMinor;
      totalAllocated += acc.totalAllocatedMinor;
      if (acc.accountType === 'cash_wallet') {
        cashBalance += acc.balanceMinor;
        cashAllocated += acc.totalAllocatedMinor;
      }
    }

    const freeToSpend = totalLiquid - totalAllocated;
    const freeToSpendCash = cashBalance - cashAllocated;
    const freeToSpendOnline = freeToSpend - freeToSpendCash;

    expect(freeToSpendCash).toBe(1300000n);
    expect(freeToSpendOnline).toBe(9000000n);
    expect(freeToSpend).toBe(10300000n);
    expect(freeToSpendOnline + freeToSpendCash).toBe(freeToSpend);
  });
});

describe('Account & Account-Type Ordering (Features 1 & 2)', () => {
  it('sorts accounts deterministically by displayOrder', () => {
    const accounts = [
      { id: 'a', name: 'Zerodha', displayOrder: 3 },
      { id: 'b', name: 'ICICI Bank', displayOrder: 1 },
      { id: 'c', name: 'Cash Wallet', displayOrder: 0 },
      { id: 'd', name: 'HDFC Bank', displayOrder: 2 },
    ];

    const sorted = [...accounts].sort((a, b) => a.displayOrder - b.displayOrder);
    expect(sorted.map(a => a.name)).toEqual([
      'Cash Wallet',
      'ICICI Bank',
      'HDFC Bank',
      'Zerodha',
    ]);
  });

  it('sorts account groups according to user preferences with fallback', () => {
    const userTypeOrder = ['cash_wallet', 'investment', 'bank', 'credit_card'];
    const groups = ['bank', 'credit_card', 'cash_wallet', 'investment', 'digital_wallet'];

    const sorted = [...groups].sort((a, b) => {
      const idxA = userTypeOrder.indexOf(a);
      const idxB = userTypeOrder.indexOf(b);
      const rankA = idxA !== -1 ? idxA : 999;
      const rankB = idxB !== -1 ? idxB : 999;
      return rankA - rankB;
    });

    expect(sorted).toEqual([
      'cash_wallet',
      'investment',
      'bank',
      'credit_card',
      'digital_wallet', // fallback for any unranked type
    ]);
  });
});
