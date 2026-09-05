import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getAccountById, getAccountTransactions } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import { Amount } from "@/components/ui/amount"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AccountActionsModal } from "@/components/accounts/AccountActionsModal"

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authContext = await requireWorkspaceAccess()
  
  const account = await getAccountById(authContext.workspaceId, id)
  if (!account) {
    notFound()
  }

  const transactions = await getAccountTransactions(account.id)

  return (
    <div className="space-y-6">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/accounts" className="text-muted-foreground text-sm hover:text-foreground hover:underline">
              &larr; Back to Accounts
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-primary">{account.name}</h1>
            {account.color && (
              <span 
                className="w-3.5 h-3.5 rounded-full ring-2 ring-background inline-block" 
                style={{ backgroundColor: account.color }}
                title="Account Accent Color"
              />
            )}
          </div>
          <p className="text-muted-foreground capitalize">
            {account.accountType.replace('_', ' ')} &bull; {account.institutionName || 'Manual Account'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AccountActionsModal account={account} />
          <Link href={`/accounts/${account.id}/reconcile`}>
            <Button variant="outline" size="sm">
              Reconcile Account
            </Button>
          </Link>
        </div>
      </header>

      <Card 
        className="bg-primary text-primary-foreground border-none relative overflow-hidden"
        style={{
          borderTop: account.color ? `6px solid ${account.color}` : undefined,
        }}
      >
        <div className="p-6">
          <p className="text-primary-foreground/80 font-medium text-sm mb-1">Current Balance</p>
          <div className="text-4xl font-bold">
            <Amount valueMinor={account.balanceMinor} currency={account.currency} showSign={false} />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Recent Activity</h2>
        <Card>
          <div className="divide-y divide-border">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No activity yet.
              </div>
            ) : (
              transactions.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">
                      {txn.description || (txn.transactionType === 'expense' ? 'Expense' : txn.transactionType === 'income' ? 'Income' : 'Transfer')}
                    </p>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <span>{new Date(txn.transactionDate).toLocaleDateString()}</span>
                      {txn.category && (
                        <>
                          <span>&bull;</span>
                          <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-medium text-foreground">{txn.category.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    {/* If this is an expense, we show it as negative, unless it's a transfer leaving the account */}
                    <Amount 
                      valueMinor={txn.transactionType === 'expense' || txn.transactionType === 'credit_card_purchase' ? -txn.amountMinor : txn.amountMinor} 
                      currency={txn.currency || account.currency}
                      colorize="inverted" 
                      showSign={true}
                      className="font-medium" 
                    />
                    <span className="text-[10px] text-muted-foreground capitalize mt-1 opacity-70">
                      {txn.transactionType}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
