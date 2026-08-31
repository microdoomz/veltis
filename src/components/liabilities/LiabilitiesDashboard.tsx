import React from 'react';
import { db } from '@/lib/db';
import { liability } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { Card } from '@/components/ui/card';
import { Amount } from '@/components/ui/amount';

export async function LiabilitiesDashboard({ workspaceId }: { workspaceId: string }) {
  const records = await db.query.liability.findMany({
    where: eq(liability.workspaceId, workspaceId),
    orderBy: (l, { desc }) => [desc(l.createdDate)]
  });

  if (records.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        No liabilities found. (Create feature to be added in V2)
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((l) => (
        <Card key={l.id} className="p-4 flex justify-between items-center">
          <div>
            <h3 className="font-medium">{l.counterpartyName} ({l.liabilityType})</h3>
            <p className="text-sm text-muted-foreground">Status: {l.status}</p>
          </div>
          <div className="text-right">
            <Amount valueMinor={l.amountMinor} colorize="default" showSign={false} />
            <div className="text-xs text-muted-foreground mt-1">{l.createdDate}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
