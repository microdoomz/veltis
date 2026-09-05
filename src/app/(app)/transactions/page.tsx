import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getRecentTransactions, getCategories, getAccountSummary } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Plus, ReceiptText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { TransactionList } from "@/components/transactions/TransactionList"

export default async function TransactionsPage(
  props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const authContext = await requireWorkspaceAccess()
  const searchParams = await props.searchParams
  const categoryFilter = searchParams?.category as string | undefined
  
  // Fetch up to 50 for the main list
  const [transactions, categories, accounts] = await Promise.all([
    getRecentTransactions(authContext.workspaceId, 50, categoryFilter),
    getCategories(authContext.workspaceId),
    getAccountSummary(authContext.workspaceId),
  ])

  // Convert bigint amounts to number for client component compatibility
  const serializedTxns = transactions.map((t) => ({
    ...t,
    amountMinor: Number(t.amountMinor),
    transactionDate: t.transactionDate.toString(),
  }))

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Transactions</h1>
          <p className="text-muted-foreground text-sm">
            Your transaction history. Click any transaction to view details, edit, or delete.
          </p>
        </div>
        <Link href="/transactions/new">
          <Button size="sm" className="rounded-xl shadow-xs">
            <Plus className="h-4 w-4 mr-1" /> Add Transaction
          </Button>
        </Link>
      </header>

      <Card className="elevation-low overflow-hidden rounded-2xl border border-border/80 shadow-xs">
        {serializedTxns.length === 0 ? (
          <EmptyState 
            icon={ReceiptText}
            title="No transactions yet" 
            description="Add your first expense or income to start tracking."
            action={
              <Link href="/transactions/new">
                <Button className="rounded-xl"><Plus className="w-4 h-4 mr-2" /> Add Transaction</Button>
              </Link>
            }
          />
        ) : (
          <>
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-[2fr,1fr,1fr,1fr,auto] gap-4 p-4 border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div>Description</div>
              <div>Category</div>
              <div>Account</div>
              <div>Date</div>
              <div className="text-right">Amount</div>
            </div>
            
            <TransactionList
              transactions={serializedTxns}
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
              accounts={accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))}
              workspaceId={authContext.workspaceId}
            />
          </>
        )}
      </Card>
    </div>
  )
}

