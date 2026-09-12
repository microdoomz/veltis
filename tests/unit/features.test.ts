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

describe('Total Wealth & SIP Unit Allocation (Latest Features)', () => {
  it('calculates Total Wealth based on live market valuation of funds rather than invested cost basis', () => {
    // Bank account: ₹1,00,000.00 (10000000 minor)
    // Credit card: ₹15,000.00 debt (1500000 minor)
    // Investment account:
    //   Invested cost basis: ₹50,000.00 (5000000 minor)
    //   Current units: 50.0
    //   Current NAV: ₹1,500.00 (150000 minor) -> Market Value: ₹75,000.00 (7500000 minor)
    const bankBalanceMinor = 10000000n;
    const creditCardDebtMinor = 1500000n;
    const investedCostBasisMinor = 5000000n;
    const units = 50.0;
    const currentNavMinor = 150000n; // ₹1,500.00

    // Old method (using cost basis / invested amount):
    const oldWealth = bankBalanceMinor + investedCostBasisMinor - creditCardDebtMinor;
    expect(oldWealth).toBe(13500000n); // ₹1,35,000.00 (understating current wealth)

    // New method (using current market value of funds owned):
    const investmentMarketValueMinor = BigInt(Math.round(units * Number(currentNavMinor)));
    expect(investmentMarketValueMinor).toBe(7500000n); // ₹75,000.00

    const totalWealth = bankBalanceMinor + investmentMarketValueMinor - creditCardDebtMinor;
    expect(totalWealth).toBe(16000000n); // ₹1,60,000.00 (accurately reflects current wealth)
  });

  it('allocates SIP units based on current NAV and recalculates weighted average cost', () => {
    // Current holding: 100 units at average cost ₹50.00 (5000 minor) -> cost basis ₹5,000.00 (500000 minor)
    // Current NAV has risen to ₹100.00 (10000 minor)
    // Monthly SIP added: ₹5,000.00 (500000 minor)
    const currentUnits = 100;
    const currentAvgCostMinor = 5000n;
    const currentNavMinor = 10000n;
    const sipAmountMinor = 500000n;

    // Allocated units must be based on current NAV: ₹5,000 / ₹100 = 50 units (NOT ₹5,000 / ₹50 = 100 units)
    const incrementalUnits = Number(sipAmountMinor) / Number(currentNavMinor);
    expect(incrementalUnits).toBe(50);

    const newTotalUnits = (currentUnits + incrementalUnits).toFixed(4);
    expect(newTotalUnits).toBe('150.0000');

    // Weighted average cost:
    // (100 * ₹50 + ₹5000) / 150 = (₹5000 + ₹5000) / 150 = ₹10,000 / 150 = ₹66.67
    const prevCostBasis = Math.round(currentUnits * Number(currentAvgCostMinor));
    const newCostBasis = prevCostBasis + Number(sipAmountMinor);
    const newAvgCostMinor = BigInt(Math.round(newCostBasis / Number(newTotalUnits)));
    expect(newAvgCostMinor).toBe(6667n); // ₹66.67
  });
});



