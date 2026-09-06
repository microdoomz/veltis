import { db } from '../src/lib/db';
import { financialAccount, investmentPosition, allocation } from '../src/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getNetWealth } from '../src/lib/ledger';

async function cleanup() {
  console.log('Running deleted account cleanup...');

  // 1. Find all archived accounts
  const archivedAccounts = await db.query.financialAccount.findMany({
    where: eq(financialAccount.status, 'archived'),
  });
  const archivedAccountIds = archivedAccounts.map(a => a.id);
  console.log(`Found ${archivedAccounts.length} archived accounts:`, archivedAccounts.map(a => `${a.name} (${a.id})`));

  if (archivedAccountIds.length > 0) {
    // 2. Delete investment positions belonging to archived accounts
    const deletedPositions = await db.delete(investmentPosition)
      .where(inArray(investmentPosition.financialAccountId, archivedAccountIds))
      .returning();
    console.log(`Deleted ${deletedPositions.length} orphaned investment positions:`, deletedPositions.map(p => p.name));

    // 3. Archive allocations belonging to archived accounts
    const updatedAllocations = await db.update(allocation)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(inArray(allocation.financialAccountId, archivedAccountIds))
      .returning();
    console.log(`Archived ${updatedAllocations.length} allocations linked to archived accounts.`);
  }

  // 4. Verify user workspaces
  const workspaces = await db.query.workspace.findMany();
  for (const ws of workspaces) {
    if (ws.name.includes('Personal Workspace') || ws.baseCurrency === 'INR') {
      const nw = await getNetWealth(ws.id);
      console.log(`Workspace ${ws.name} (${ws.id}): Net Wealth = ₹${Number(nw) / 100}`);
    }
  }

  console.log('Cleanup completed successfully.');
  process.exit(0);
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
