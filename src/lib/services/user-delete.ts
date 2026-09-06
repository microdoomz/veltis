import { db } from '../db';
import {
  workspace,
  workspaceMember,
  financialAccount,
  accountState,
  transaction,
  transactionLeg,
  category,
  tag,
  transactionTag,
  allocation,
  transactionAllocation,
  lienSnapshot,
  receivable,
  receivableSettlement,
  liability,
  liabilityPayment,
  investmentPosition,
  investmentTransaction,
  investmentPriceSnapshot,
  heldForOther,
  recurringItem,
  recurringOccurrence,
  statementImport,
  statementImportRow,
  merchantRule,
  reconciliation,
  shortcutToken,
  idempotencyKey,
  auditEvent,
  notification,
  budget,
  user,
  session,
  account,
  twoFactor,
  passkey,
} from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Permanently deletes a user and all data belonging to their workspace(s).
 * Cleans up foreign key relationships in proper order and removes the user record,
 * allowing the email address to be completely free for future account creation.
 */
export async function deleteUserAccount(userId: string) {
  return await db.transaction(async (tx) => {
    // 1. Find all workspaces associated with this user
    const memberships = await tx
      .select({ workspaceId: workspaceMember.workspaceId })
      .from(workspaceMember)
      .where(eq(workspaceMember.userId, userId));

    const workspaceIds = memberships.map((m) => m.workspaceId);

    const createdWs = await tx
      .select({ id: workspace.id })
      .from(workspace)
      .where(eq(workspace.createdByUserId, userId));

    for (const ws of createdWs) {
      if (!workspaceIds.includes(ws.id)) {
        workspaceIds.push(ws.id);
      }
    }

    // 2. For each workspace, purge all dependent entities
    for (const wsId of workspaceIds) {
      // Statement imports & rows
      const wsImports = await tx
        .select({ id: statementImport.id })
        .from(statementImport)
        .where(eq(statementImport.workspaceId, wsId));
      const importIds = wsImports.map((i) => i.id);

      if (importIds.length > 0) {
        await tx
          .delete(statementImportRow)
          .where(inArray(statementImportRow.statementImportId, importIds));
        await tx
          .delete(statementImport)
          .where(inArray(statementImport.id, importIds));
      }

      // Reconciliations & Shortcut tokens
      await tx.delete(reconciliation).where(eq(reconciliation.workspaceId, wsId));
      await tx.delete(shortcutToken).where(eq(shortcutToken.workspaceId, wsId));
      await tx.delete(idempotencyKey).where(eq(idempotencyKey.workspaceId, wsId));
      await tx.delete(auditEvent).where(eq(auditEvent.workspaceId, wsId));
      await tx.delete(notification).where(eq(notification.workspaceId, wsId));
      await tx.delete(budget).where(eq(budget.workspaceId, wsId));
      await tx.delete(merchantRule).where(eq(merchantRule.workspaceId, wsId));
      await tx.delete(heldForOther).where(eq(heldForOther.workspaceId, wsId));

      // Recurring items & occurrences
      const wsRecurring = await tx
        .select({ id: recurringItem.id })
        .from(recurringItem)
        .where(eq(recurringItem.workspaceId, wsId));
      const recIds = wsRecurring.map((r) => r.id);
      if (recIds.length > 0) {
        await tx
          .delete(recurringOccurrence)
          .where(inArray(recurringOccurrence.recurringItemId, recIds));
        await tx
          .delete(recurringItem)
          .where(inArray(recurringItem.id, recIds));
      }

      // Investments
      const wsPositions = await tx
        .select({ id: investmentPosition.id })
        .from(investmentPosition)
        .where(eq(investmentPosition.workspaceId, wsId));
      const posIds = wsPositions.map((p) => p.id);
      if (posIds.length > 0) {
        await tx
          .delete(investmentPriceSnapshot)
          .where(inArray(investmentPriceSnapshot.positionId, posIds));
        await tx
          .delete(investmentTransaction)
          .where(inArray(investmentTransaction.positionId, posIds));
        await tx
          .delete(investmentPosition)
          .where(inArray(investmentPosition.id, posIds));
      }

      // Liabilities & Payments
      const wsLiabilities = await tx
        .select({ id: liability.id })
        .from(liability)
        .where(eq(liability.workspaceId, wsId));
      const liabIds = wsLiabilities.map((l) => l.id);
      if (liabIds.length > 0) {
        await tx
          .delete(liabilityPayment)
          .where(inArray(liabilityPayment.liabilityId, liabIds));
        await tx
          .delete(liability)
          .where(inArray(liability.id, liabIds));
      }

      // Receivables & Settlements
      const wsReceivables = await tx
        .select({ id: receivable.id })
        .from(receivable)
        .where(eq(receivable.workspaceId, wsId));
      const recsIds = wsReceivables.map((r) => r.id);
      if (recsIds.length > 0) {
        await tx
          .delete(receivableSettlement)
          .where(inArray(receivableSettlement.receivableId, recsIds));
        await tx
          .delete(receivable)
          .where(inArray(receivable.id, recsIds));
      }

      // Allocations & transaction allocations
      const wsAllocations = await tx
        .select({ id: allocation.id })
        .from(allocation)
        .where(eq(allocation.workspaceId, wsId));
      const allocIds = wsAllocations.map((a) => a.id);
      if (allocIds.length > 0) {
        await tx
          .delete(transactionAllocation)
          .where(inArray(transactionAllocation.allocationId, allocIds));
        await tx
          .delete(allocation)
          .where(inArray(allocation.id, allocIds));
      }

      // Financial accounts & liens & states
      const wsAccounts = await tx
        .select({ id: financialAccount.id })
        .from(financialAccount)
        .where(eq(financialAccount.workspaceId, wsId));
      const accIds = wsAccounts.map((a) => a.id);
      if (accIds.length > 0) {
        await tx
          .delete(lienSnapshot)
          .where(inArray(lienSnapshot.financialAccountId, accIds));
        await tx
          .delete(accountState)
          .where(inArray(accountState.financialAccountId, accIds));
      }

      // Transactions, Legs, & Tags
      const wsTxns = await tx
        .select({ id: transaction.id })
        .from(transaction)
        .where(eq(transaction.workspaceId, wsId));
      const txnIds = wsTxns.map((t) => t.id);
      if (txnIds.length > 0) {
        await tx
          .delete(transactionTag)
          .where(inArray(transactionTag.transactionId, txnIds));
        await tx
          .delete(transactionLeg)
          .where(inArray(transactionLeg.transactionId, txnIds));
        await tx
          .delete(transaction)
          .where(inArray(transaction.id, txnIds));
      }

      // Tags
      await tx.delete(tag).where(eq(tag.workspaceId, wsId));

      // Financial accounts deletion
      if (accIds.length > 0) {
        await tx
          .delete(financialAccount)
          .where(inArray(financialAccount.id, accIds));
      }

      // Categories
      await tx.delete(category).where(eq(category.workspaceId, wsId));

      // Workspace members & workspace
      await tx.delete(workspaceMember).where(eq(workspaceMember.workspaceId, wsId));
      await tx.delete(workspace).where(eq(workspace.id, wsId));
    }

    // 3. Purge user-level authentication and profile records
    await tx.delete(passkey).where(eq(passkey.userId, userId));
    await tx.delete(twoFactor).where(eq(twoFactor.userId, userId));
    await tx.delete(session).where(eq(session.userId, userId));
    await tx.delete(account).where(eq(account.userId, userId));
    await tx.delete(user).where(eq(user.id, userId));

    return { success: true };
  });
}
