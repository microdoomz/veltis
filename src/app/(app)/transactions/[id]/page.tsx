import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getTransactionById } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import { Amount } from "@/components/ui/amount"
import { notFound } from "next/navigation"
import Link from "next/link"
import { deleteTransactionAction } from "@/app/actions/transaction"
import { Button } from "@/components/ui/button"

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authContext = await requireWorkspaceAccess()
  
  const txn = await getTransactionById(authContext.workspaceId, id)
  if (!txn) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/transactions" className="text-muted-foreground text-sm hover:text-foreground hover:underline">
            &larr; Back to Transactions
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Transaction Detail</h1>
      </header>

      <Card>
        <div className="p-6 space-y-6">
          <div className="text-center pb-6 border-b border-border">
            <p className="text-4xl font-bold">
              <Amount 
                valueMinor={txn.transactionType === 'expense' || txn.transactionType === 'credit_card_purchase' ? -txn.amountMinor : txn.amountMinor} 
                colorize="inverted" 
                showSign={true}
              />
            </p>
            <p className="text-muted-foreground mt-2 font-medium">
              {txn.description || (txn.transactionType === 'expense' ? 'Expense' : txn.transactionType === 'income' ? 'Income' : 'Transfer')}
            </p>
            <span className="inline-block px-2 py-1 bg-muted rounded mt-3 text-xs uppercase tracking-wider font-semibold">
              {txn.transactionType.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Date</p>
              <p className="font-medium">{new Date(txn.transactionDate).toLocaleDateString()}</p>
            </div>
            {txn.category && (
              <div>
                <p className="text-muted-foreground mb-1">Category</p>
                <p className="font-medium">{txn.category.name}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground mb-1">Source / Creation</p>
              <p className="font-medium capitalize">{txn.source}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Status</p>
              <p className="font-medium capitalize">{txn.status}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Ledger Movement</h3>
            <div className="space-y-2">
              {txn.legs.map(leg => (
                <div key={leg.id} className="flex justify-between items-center text-sm p-3 bg-muted/50 rounded-lg">
                  <div>
                    <span className="font-medium">{leg.account?.name}</span>
                    <span className="text-xs text-muted-foreground block capitalize">{leg.direction}</span>
                  </div>
                  <Amount valueMinor={leg.amountMinor} className="font-medium" colorize="none" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <form action={async () => {
              "use server"
              await deleteTransactionAction(authContext.workspaceId, txn.id)
            }}>
              <Button type="submit" variant="danger" className="w-full">
                Delete Transaction
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  )
}
