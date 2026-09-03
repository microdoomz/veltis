import React from 'react';
import { db } from '@/lib/db';
import { receivable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Card } from '@/components/ui/card';
import { Amount } from '@/components/ui/amount';

export async function ReceivablesDashboard({ workspaceId }: { workspaceId: string }) {
  const records = await db.query.receivable.findMany({
    where: eq(receivable.workspaceId, workspaceId),
    orderBy: (r, { desc }) => [desc(r.createdDate)]
  });

  if (records.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        No receivables found. (Create feature to be added in V2)
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((r) => (
        <Card key={r.id} className="p-4 flex justify-between items-center">
          <div>
            <h3 className="font-medium">{r.counterpartyName}</h3>
            <p className="text-sm text-muted-foreground">Status: {r.status}</p>
          </div>
          <div className="text-right">
            <Amount valueMinor={r.amountMinor} colorize="default" showSign={false} />
            <div className="text-xs text-muted-foreground mt-1">{r.createdDate}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
