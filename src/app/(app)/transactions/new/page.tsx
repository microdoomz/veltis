import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getAccountSummary, getCategories } from "@/lib/ledger/queries"
import { TransactionForm } from "@/components/transactions/TransactionForm"

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  const authContext = await requireWorkspaceAccess()
  const resolvedParams = searchParams ? await searchParams : undefined;
  const rawType = resolvedParams?.type;
  const initialType = (rawType === 'income' || rawType === 'transfer' || rawType === 'expense')
    ? rawType
    : 'expense';
  
  // Fetch required reference data for the form
  const [accounts, categories] = await Promise.all([
    getAccountSummary(authContext.workspaceId),
    getCategories(authContext.workspaceId)
  ])

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary text-center">New Transaction</h1>
      </header>

      <TransactionForm 
        workspaceId={authContext.workspaceId}
        initialType={initialType}
        accounts={accounts.map(a => ({ id: a.id, name: a.name }))}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
      />
    </div>
  )
}
