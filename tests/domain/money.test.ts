import { describe, it, expect } from 'vitest';
import { money } from '@/lib/money';

describe('Money utility', () => {
  it('converts major to minor correctly', () => {
    expect(money.fromMajor(10.50)).toBe(1050n);
    expect(money.fromMajor(0.01)).toBe(1n);
    expect(money.fromMajor(0)).toBe(0n);
    expect(money.fromMajor(-10.50)).toBe(-1050n);
  });

  it('converts minor to major correctly', () => {
    expect(money.toMajor(1050n)).toBe(10.5);
    expect(money.toMajor(1n)).toBe(0.01);
    expect(money.toMajor(0n)).toBe(0);
    expect(money.toMajor(-1050n)).toBe(-10.5);
  });

  it('adds safely', () => {
    expect(money.add(1000n, 500n)).toBe(1500n);
    expect(money.add(1000n, -500n)).toBe(500n);
    expect(money.add(0n, 0n)).toBe(0n);
    expect(money.add(100n, 200n, 300n)).toBe(600n);
  });

  it('subtracts safely', () => {
    expect(money.subtract(1000n, 500n)).toBe(500n);
    expect(money.subtract(1000n, 1500n)).toBe(-500n);
  });

  it('formats correctly', () => {
    expect(money.format(1050n, 'USD')).toBe('$10.50');
    expect(money.format(-1050n, 'USD')).toBe('-$10.50');
  });
});
