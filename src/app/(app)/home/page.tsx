import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getNetWealth, getAvailableMoney } from "@/lib/ledger/index"
import { getRecentTransactions, getAccountSummary } from "@/lib/ledger/queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Amount } from "@/components/ui/amount"
import { Wallet, CreditCard, Building2, TrendingUp, PiggyBank } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

function getAccountIcon(type: string) {
  switch (type) {
    case 'bank': return <Building2 className="h-5 w-5 text-primary" />
    case 'cash_wallet': return <Wallet className="h-5 w-5 text-positive" />
    case 'digital_wallet': return <Wallet className="h-5 w-5 text-teal-500" />
    case 'credit_card': return <CreditCard className="h-5 w-5 text-danger" />
    case 'investment': return <TrendingUp className="h-5 w-5 text-indigo-500" />
    default: return <PiggyBank className="h-5 w-5 text-muted-foreground" />
  }
}

export default async function HomePage() {
  let authContext;
  try {
    authContext = await requireWorkspaceAccess()
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      redirect('/login')
    }
    throw error;
  }
  
  const workspaceId = authContext.workspaceId

  // Fetch Core Financial Data concurrently
  const [netWealth, availableMoney, recentTxns, accounts] = await Promise.all([
    getNetWealth(workspaceId),
    getAvailableMoney(workspaceId),
    getRecentTransactions(workspaceId, 5),
    getAccountSummary(workspaceId)
  ])

  // Group accounts for summary
  const assetAccounts = accounts.filter(a => !['credit_card'].includes(a.accountType))
  const liabilityAccounts = accounts.filter(a => ['credit_card'].includes(a.accountType))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Overview</h1>
        <p className="text-muted-foreground">Here is where you stand financially.</p>
      </header>

      {/* Hero Balances */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-primary text-primary-foreground border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-primary-foreground/80 font-medium">Total Wealth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              <Amount valueMinor={netWealth} showSign={false} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground font-medium">Available Money</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">
              <Amount valueMinor={availableMoney} showSign={false} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Summary */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Your Accounts</h2>
          <div className="space-y-3">
            {assetAccounts.map(acc => (
              <Card key={acc.id}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-full">
                      {getAccountIcon(acc.accountType)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{acc.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{acc.accountType.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Amount valueMinor={acc.balanceMinor} colorize="default" className="font-medium" />
                  </div>
                </div>
              </Card>
            ))}

            {liabilityAccounts.length > 0 && (
              <div className="pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Liabilities</h3>
                {liabilityAccounts.map(acc => (
                  <Card key={acc.id} className="border-danger/20">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-danger/10 rounded-full">
                          {getAccountIcon(acc.accountType)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{acc.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{acc.accountType.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {/* Note: Credit cards usually have negative ledger balances representing debt. */}
                        <Amount valueMinor={acc.balanceMinor} colorize="default" className="font-medium" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          <div className="pt-2">
            <Link href="/accounts" className="text-sm text-primary hover:underline font-medium">
              View all accounts &rarr;
            </Link>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Recent Activity</h2>
          <Card>
            <div className="divide-y divide-border">
              {recentTxns.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No transactions yet.
                </div>
              ) : (
                recentTxns.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">
                        {txn.description || (txn.transactionType === 'expense' ? 'Expense' : txn.transactionType === 'income' ? 'Income' : 'Transfer')}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{new Date(txn.transactionDate).toLocaleDateString()}</span>
                        {txn.category && (
                          <>
                            <span>&bull;</span>
                            <span>{txn.category.name}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      {/* For expense, show negative if we want, or just let colorize handle it based on type */}
                      <Amount 
                        valueMinor={txn.transactionType === 'expense' || txn.transactionType === 'credit_card_purchase' ? -txn.amountMinor : txn.amountMinor} 
                        colorize="inverted" 
                        showSign={true}
                        className="font-medium" 
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
          
          <div className="pt-2">
            <Link href="/transactions" className="text-sm text-primary hover:underline font-medium">
              View all transactions &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
