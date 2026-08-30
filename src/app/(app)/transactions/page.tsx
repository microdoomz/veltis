import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getRecentTransactions } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import { Amount } from "@/components/ui/amount"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function TransactionsPage() {
  const authContext = await requireWorkspaceAccess()
  // Fetch up to 50 for the main list for now
  const transactions = await getRecentTransactions(authContext.workspaceId, 50)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Transactions</h1>
          <p className="text-muted-foreground">Your transaction history.</p>
        </div>
        <Link href="/transactions/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </Link>
      </header>

      <Card>
        <div className="divide-y divide-border">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No transactions found. Add your first expense or income!
            </div>
          ) : (
            transactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium text-sm">
                    {txn.description || (txn.transactionType === 'expense' ? 'Expense' : txn.transactionType === 'income' ? 'Income' : 'Transfer')}
                  </p>
                  <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                    <span>{new Date(txn.transactionDate).toLocaleDateString()}</span>
                    
                    {txn.category && (
                      <>
                        <span className="hidden sm:inline">&bull;</span>
                        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-medium">{txn.category.name}</span>
                      </>
                    )}
                    
                    {txn.legs.length > 0 && (
                      <>
                        <span className="hidden sm:inline">&bull;</span>
                        <span>{txn.legs[0].account?.name}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <Amount 
                    valueMinor={txn.transactionType === 'expense' || txn.transactionType === 'credit_card_purchase' ? -txn.amountMinor : txn.amountMinor} 
                    colorize="inverted" 
                    showSign={true}
                    className="font-medium" 
                  />
                  {/* Status Indicator for offline/pending in the future, for now just show source */}
                  <span className="text-[10px] text-muted-foreground capitalize mt-1 opacity-70">
                    {txn.source}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
