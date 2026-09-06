import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getTransactionById } from "@/lib/ledger/queries"
import { getAccounts } from "@/lib/services/account"
import { db } from "@/lib/db"
import { category } from "@/lib/db/schema"
import { eq, and, isNull, asc } from "drizzle-orm"
import { Card } from "@/components/ui/card"
import { Amount } from "@/components/ui/amount"
import { notFound } from "next/navigation"
import Link from "next/link"
import { TransactionActionsModal } from "@/components/transactions/TransactionActionsModal"

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authContext = await requireWorkspaceAccess()
  
  const [txn, categories, accounts] = await Promise.all([
    getTransactionById(authContext.workspaceId, id),
    db.query.category.findMany({
      where: and(eq(category.workspaceId, authContext.workspaceId), isNull(category.archivedAt)),
      orderBy: [asc(category.name)],
    }),
    getAccounts(authContext.workspaceId),
  ])

  if (!txn) {
    notFound()
  }

  const primaryAccountId = txn.legs.find((l) => l.accountId !== null)?.accountId || null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/transactions" className="text-muted-foreground text-sm hover:text-foreground hover:underline">
              &larr; Back to Transactions
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Transaction Detail</h1>
        </div>
        <TransactionActionsModal
          workspaceId={authContext.workspaceId}
          transaction={{
            id: txn.id,
            description: txn.description,
            merchantName: txn.merchantName,
            amountMinor: txn.amountMinor,
            currency: txn.currency,
            transactionDate: txn.transactionDate,
            categoryId: txn.categoryId,
            accountId: primaryAccountId,
            type: txn.transactionType,
          }}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))}
        />
      </header>

      <Card>
        <div className="p-6 space-y-6">
          <div className="text-center pb-6 border-b border-border">
            <p className="text-4xl font-bold">
              <Amount 
                valueMinor={txn.transactionType === 'expense' || txn.transactionType === 'credit_card_purchase' ? -txn.amountMinor : txn.amountMinor} 
                colorize="default" 
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
        </div>
      </Card>
    </div>
  )
}
