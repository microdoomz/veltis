import { db } from '../db';
import { reconciliation, accountState } from '../db/schema';
import { getAccountLedgerBalance } from '../ledger';
import { createAdjustmentTransaction } from './transaction';

export type ReconcileAccountParams = {
  workspaceId: string;
  accountId: string;
  userId: string;
  actualBalanceMinor: bigint;
  createAdjustment: boolean;
  note?: string;
};

export async function reconcileAccount(params: ReconcileAccountParams) {
  return await db.transaction(async (tx) => {
    // Fetch account currency
    const account = await tx.query.financialAccount.findFirst({
      where: (account, { eq }) => eq(account.id, params.accountId),
      columns: { currency: true }
    });
    
    if (!account) {
      throw new Error(`Account ${params.accountId} not found.`);
    }

    // 1. Calculate current ledger balance
    const calculatedBalanceMinor = await getAccountLedgerBalance(params.accountId, tx);
    
    const differenceMinor = params.actualBalanceMinor - calculatedBalanceMinor;
    
    let adjustmentTransactionId: string | null = null;
    
    // 2. Optional: Create adjustment transaction
    if (params.createAdjustment && differenceMinor !== 0n) {
      // Determine direction:
      // If actual is greater than calculated (difference > 0), we need to INCREASE the balance.
      // If actual is less than calculated (difference < 0), we need to DECREASE the balance.
      const adjustmentDirection = differenceMinor > 0n ? 'increase' : 'decrease';
      const absDifference = differenceMinor > 0n ? differenceMinor : -differenceMinor;
      
      // Pass `tx` down to ensure the adjustment transaction is created in the same atomic block
      // as the reconciliation record.
      
      const newTx = await createAdjustmentTransaction({
        workspaceId: params.workspaceId,
        createdByUserId: params.userId,
        accountId: params.accountId,
        amountMinor: absDifference,
        adjustmentDirection,
        currency: account.currency,
        transactionDate: new Date(),
        description: params.note || 'Reconciliation Adjustment',
        source: 'system'
      }, tx);
      
      adjustmentTransactionId = newTx.id;
    }
    
    // 3. Create reconciliation record
    const [reconciliationRecord] = await tx.insert(reconciliation).values({
      workspaceId: params.workspaceId,
      financialAccountId: params.accountId,
      reconciliationDate: new Date().toISOString().split('T')[0],
      calculatedBalanceMinor,
      actualBalanceMinor: params.actualBalanceMinor,
      differenceMinor,
      adjustmentTransactionId,
      note: params.note,
      createdByUserId: params.userId,
    }).returning();
    
    // 4. Update account state
    await tx.insert(accountState)
      .values({
        financialAccountId: params.accountId,
        reconciledBalanceMinor: params.actualBalanceMinor,
        lastReconciledAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountState.financialAccountId,
        set: {
          reconciledBalanceMinor: params.actualBalanceMinor,
          lastReconciledAt: new Date(),
          updatedAt: new Date(),
        }
      });
      
    return reconciliationRecord;
  });
}
