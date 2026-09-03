import React from 'react';
import { ReceivablesDashboard } from '@/components/receivables/ReceivablesDashboard';
import { getUser } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Receivables - Veltis',
};

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: { workspaceId?: string };
}) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const workspaceId = searchParams.workspaceId;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Receivables</h1>
      </div>
      
      {workspaceId ? (
        <ReceivablesDashboard workspaceId={workspaceId} />
      ) : (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">Please select a workspace to view receivables.</p>
        </div>
      )}
    </div>
  );
}
