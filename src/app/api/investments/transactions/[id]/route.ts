import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { investmentTransaction, investmentPosition } from '@/lib/db/schema';
import { softDeleteTransaction } from '@/lib/services/transaction';

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const authContext = await requireWorkspaceAccess();

    const invTx = await db.query.investmentTransaction.findFirst({
      where: and(
        eq(investmentTransaction.id, id),
        eq(investmentTransaction.workspaceId, authContext.workspaceId)
      ),
    });

    if (!invTx) {
      return NextResponse.json({ error: 'Investment transaction not found' }, { status: 404 });
    }

    if (invTx.transactionId) {
      // Reverses money to original bank account and holding units
      await softDeleteTransaction(invTx.transactionId);
    } else {
      // Direct reversal of units if no parent ledger transaction
      await db.transaction(async (tx) => {
        const pos = await tx.query.investmentPosition.findFirst({
          where: eq(investmentPosition.id, invTx.positionId),
        });

        if (pos) {
          const currentUnits = Number(pos.units || '0');
          const txUnits = Number(invTx.units || '0');

          if (invTx.transactionType === 'buy') {
            const newUnits = Math.max(0, currentUnits - txUnits);
            const currentTotalCost = currentUnits * Number(pos.averageCostMinor || 0n);
            const newTotalCost = Math.max(0, currentTotalCost - Number(invTx.amountMinor));
            const newAvgCostMinor = newUnits > 0
              ? BigInt(Math.round(newTotalCost / newUnits))
              : (pos.averageCostMinor || 0n);

            await tx.update(investmentPosition).set({
              units: newUnits.toFixed(4),
              averageCostMinor: newAvgCostMinor,
              updatedAt: new Date(),
            }).where(eq(investmentPosition.id, pos.id));
          } else if (invTx.transactionType === 'sell') {
            const newUnits = currentUnits + txUnits;
            await tx.update(investmentPosition).set({
              units: newUnits.toFixed(4),
              updatedAt: new Date(),
            }).where(eq(investmentPosition.id, pos.id));
          }
        }

        await tx.delete(investmentTransaction).where(eq(investmentTransaction.id, invTx.id));
      });
    }

    return NextResponse.json({ success: true, message: 'Investment transaction deleted and money/units reversed.' });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Unauthorized' || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
