import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getAccountById, getAccountTransactions } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import { Amount } from "@/components/ui/amount"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AccountActionsModal } from "@/components/accounts/AccountActionsModal"
import { AccountAllocations } from "@/components/accounts/AccountAllocations"

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authContext = await requireWorkspaceAccess()
  
  const account = await getAccountById(authContext.workspaceId, id)
  if (!account) {
    notFound()
  }

  const transactions = await getAccountTransactions(account.id, 10)

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/accounts" className="text-muted-foreground text-sm hover:text-foreground hover:underline">
              &larr; Back to Accounts
            </Link>
          </div>
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-primary break-words leading-tight">{account.name}</h1>
            {account.color && (
              <span 
                className="w-3.5 h-3.5 rounded-full ring-2 ring-background inline-block shrink-0" 
                style={{ backgroundColor: account.color }}
                title="Account Accent Color"
              />
            )}
          </div>
          <p className="text-muted-foreground capitalize">
            {account.accountType.replace('_', ' ')} &bull; {account.institutionName || 'Manual Account'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 w-full sm:w-auto">
          <AccountActionsModal account={account} />
          <Link href={`/accounts/${account.id}/reconcile`} className="shrink-0">
            <Button variant="outline" size="sm" className="whitespace-nowrap h-8 px-2.5 sm:px-3 text-xs sm:text-sm">
              Reconcile Account
            </Button>
          </Link>
        </div>
      </header>

      {/* Account Allocations & Set-Aside Money */}
      {account.accountType !== 'investment' && (
        <AccountAllocations 
          accountId={account.id} 
          currency={account.currency} 
          totalBalanceMinor={account.balanceMinor} 
        />
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Recent Activity</h2>
        <Card className="min-w-0 overflow-hidden">
          <div className="divide-y divide-border">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No activity yet.
              </div>
            ) : (
              transactions.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate" title={txn.description || undefined}>
                      {txn.description || (txn.transactionType === 'expense' ? 'Expense' : txn.transactionType === 'income' ? 'Income' : 'Transfer')}
                    </p>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 truncate">
                      <span className="shrink-0">{new Date(txn.transactionDate).toLocaleDateString()}</span>
                      {txn.category && (
                        <>
                          <span>&bull;</span>
                          <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-medium text-foreground truncate">{txn.category.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end shrink-0 whitespace-nowrap pl-2">
                    {/* If this is an expense, we show it as negative with minus and red; income is positive with plus and green */}
                    <Amount 
                      valueMinor={txn.transactionType === 'expense' || txn.transactionType === 'credit_card_purchase' ? -txn.amountMinor : txn.amountMinor} 
                      currency={txn.currency || account.currency}
                      colorize="default" 
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
          <div className="p-3.5 text-center border-t border-border bg-muted/20">
            <Link
              href={`/transactions?accountId=${account.id}`}
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1.5 transition-colors"
            >
              View all transactions for this account &rarr;
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
