import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getAccountSummary, getCategories } from "@/lib/ledger/queries"
import { TransactionForm } from "@/components/transactions/TransactionForm"

export default async function NewTransactionPage() {
  const authContext = await requireWorkspaceAccess()
  
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
        accounts={accounts.map(a => ({ id: a.id, name: a.name }))}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
      />
    </div>
  )
}
