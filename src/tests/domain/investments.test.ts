import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordContribution, recordWithdrawal, buyPosition, sellPosition } from '@/lib/investments/service';
import { db } from '@/lib/db';
import * as idempotency from '@/lib/services/idempotency';

vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn(async (cb) => {
      return cb({
        query: {
          financialAccount: { findFirst: vi.fn() },
          investmentPosition: { findFirst: vi.fn() },
        },
        insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => [{ id: 'mock-id' }]) })) })),
        update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
        delete: vi.fn(() => ({ where: vi.fn() })),
      });
    }),
    query: {
      financialAccount: { findFirst: vi.fn() },
      investmentPosition: { findFirst: vi.fn() },
    }
  }
}));

vi.mock('@/lib/services/idempotency', () => ({
  checkIdempotency: vi.fn(),
  recordIdempotency: vi.fn()
}));

describe('Investments Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records a contribution correctly', async () => {
    // @ts-expect-error mocked db query
    (db.query.financialAccount.findFirst as any)
      .mockResolvedValueOnce({ id: 'acc2', accountType: 'investment', currency: 'USD' });

    const mockTx = {
      query: {
        financialAccount: {
          findFirst: vi.fn().mockResolvedValue({ id: 'acc1', accountType: 'depository', currency: 'USD' })
        }
      },
      insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => [{ id: 'mock-tx' }]) })) }))
    };

    // @ts-expect-error mocked db tx
    db.transaction.mockImplementationOnce(async (cb) => cb(mockTx));

    const result = await recordContribution(
      'workspace-1',
      'acc1',
      'acc2',
      10000n,
      'USD',
      new Date(),
      'user-1'
    );

    expect(result).toBe('mock-tx');
    expect(mockTx.insert).toHaveBeenCalled();
  });
});
