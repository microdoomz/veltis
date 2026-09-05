import React from 'react';
import { ReceivablesDashboard } from '@/components/receivables/ReceivablesDashboard';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { getAccounts } from '@/lib/services/account';

export const metadata = {
  title: 'Receivables - Veltis',
};

export default async function ReceivablesPage() {
  const authContext = await requireWorkspaceAccess();
  const accounts = await getAccounts(authContext.workspaceId);

  const serializedAccounts = accounts.map(a => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
    accountType: a.accountType,
  }));

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 pb-24">
      <ReceivablesDashboard
        workspaceId={authContext.workspaceId}
        accounts={serializedAccounts}
      />
    </div>
  );
}
