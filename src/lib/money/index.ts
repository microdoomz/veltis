/**
 * Represents money in minor units (e.g., cents) using BigInt to prevent floating point errors.
 * All math operations return BigInt.
 */
export const money = {
  zero: 0n,
  
  /**
   * Convert a floating point major value (e.g. 10.50) to minor units (1050).
   * Note: This is prone to floating point issues if used carelessly. 
   * It's better to accept strings or deal strictly in integers when possible.
   */
  fromMajor: (major: number, precision: number = 2): bigint => {
    return BigInt(Math.round(major * Math.pow(10, precision)));
  },

  /**
   * Convert minor units (e.g. 1050) to a major value float (10.50).
   */
  toMajor: (minor: bigint | number, precision: number = 2): number => {
    const min = typeof minor === 'number' ? minor : Number(minor);
    return min / Math.pow(10, precision);
  },

  add: (...amounts: (bigint | number)[]): bigint => {
    return amounts.reduce<bigint>((sum, a) => sum + BigInt(a), 0n);
  },

  subtract: (a: bigint | number, b: bigint | number): bigint => {
    return BigInt(a) - BigInt(b);
  },

  multiply: (a: bigint | number, multiplier: number): bigint => {
    // To safely multiply and round, we convert the result back to bigint.
    const result = Number(a) * multiplier;
    return BigInt(Math.round(result));
  },

  format: (minor: bigint | number, currency: string = 'USD', precision: number = 2): string => {
    const major = money.toMajor(minor, precision);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(major);
  },
};
