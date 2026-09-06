import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getNetWealth, getLiquidSummary } from "@/lib/ledger/index"
import { getRecentTransactions, getAccountSummary } from "@/lib/ledger/queries"
import { getWorkspaceById } from "@/lib/services/workspace"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Amount } from "@/components/ui/amount"
import { RefreshButton } from "@/components/ui/refresh-button"
import { OnboardingBanner } from "@/components/onboarding/OnboardingBanner"
import { Wallet, CreditCard, Building2, TrendingUp, PiggyBank, ShieldCheck, Lock } from "lucide-react"
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
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      redirect('/login')
    }
    throw error;
  }
  
  const workspaceId = authContext.workspaceId

  // Fetch Core Financial Data concurrently
  const [netWealth, liquidSummary, recentTxns, accounts, currentWorkspace] = await Promise.all([
    getNetWealth(workspaceId),
    getLiquidSummary(workspaceId),
    getRecentTransactions(workspaceId, 5),
    getAccountSummary(workspaceId),
    getWorkspaceById(workspaceId),
  ])

  // Group accounts for summary
  const assetAccounts = accounts.filter(a => !['credit_card'].includes(a.accountType))
  const liabilityAccounts = accounts.filter(a => ['credit_card'].includes(a.accountType))

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Overview</h1>
            <RefreshButton />
          </div>
          <p className="text-muted-foreground">Here is where you stand financially.</p>
        </div>
      </header>

      {/* Onboarding Banner for users without accounts */}
      {accounts.length === 0 && (
        <OnboardingBanner workspaceName={currentWorkspace?.name} />
      )}

      {/* Hero Balances */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-primary text-primary-foreground border-none shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-primary-foreground/80 text-sm font-medium">Total Wealth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight">
              <Amount valueMinor={netWealth} currency={currentWorkspace?.baseCurrency || 'USD'} showSign={false} />
            </div>
            <p className="text-xs text-primary-foreground/70 mt-3">
              Net balance across all accounts &amp; investments
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">Liquid Balance</CardTitle>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                Bank &amp; Cash
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-4xl font-bold text-foreground tracking-tight">
              <Amount valueMinor={liquidSummary.totalLiquid} currency={currentWorkspace?.baseCurrency || 'USD'} showSign={false} />
            </div>

            {/* Sub-metrics */}
            <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-border/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-positive" />
                  <span>Free to spend</span>
                </div>
                <Amount
                  valueMinor={liquidSummary.freeToSpend}
                  currency={currentWorkspace?.baseCurrency || 'USD'}
                  showSign={false}
                  className="text-sm font-bold text-positive"
                />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Allocated money</span>
                </div>
                <Amount
                  valueMinor={liquidSummary.totalAllocated}
                  currency={currentWorkspace?.baseCurrency || 'USD'}
                  showSign={false}
                  className="text-sm font-bold text-amber-600 dark:text-amber-400"
                />
              </div>
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
              <Card 
                key={acc.id}
                style={{ borderLeft: acc.color ? `4px solid ${acc.color}` : undefined }}
              >
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-full"
                        style={{
                          backgroundColor: acc.color ? `${acc.color}20` : 'var(--muted)',
                          color: acc.color || 'inherit',
                        }}
                      >
                        {getAccountIcon(acc.accountType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm">{acc.name}</p>
                          {acc.color && (
                            <span 
                              className="inline-block w-2 h-2 rounded-full" 
                              style={{ backgroundColor: acc.color }} 
                              title="Account Color"
                            />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{acc.accountType.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Amount valueMinor={acc.balanceMinor} currency={acc.currency} colorize="default" className="font-semibold text-base" />
                      <p className="text-[10px] text-muted-foreground">Total Balance</p>
                    </div>
                  </div>

                  {acc.allocations && acc.allocations.length > 0 && (
                    <div className="pt-2 border-t border-border/50 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <PiggyBank className="w-3 h-3 text-amber-500" />
                          Set Aside ({acc.allocations.length}):
                        </span>
                        <div className="flex flex-wrap items-center gap-1 justify-end">
                          {acc.allocations.map((al) => (
                            <span key={al.id} className="text-[10px] px-1.5 py-0.2 rounded bg-muted/60 border border-border/40 text-foreground">
                              {al.name}: <Amount valueMinor={BigInt(al.amountMinor)} currency={acc.currency} className="font-medium" />
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Free to spend:
                        </span>
                        <Amount valueMinor={acc.freeToSpendMinor} currency={acc.currency} className="font-bold text-emerald-600 dark:text-emerald-400 text-xs" />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}

            {liabilityAccounts.length > 0 && (
              <div className="pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Liabilities</h3>
                {liabilityAccounts.map(acc => (
                  <Card 
                    key={acc.id} 
                    className="border-danger/20"
                    style={{ borderLeft: acc.color ? `4px solid ${acc.color}` : undefined }}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-full"
                          style={{
                            backgroundColor: acc.color ? `${acc.color}20` : 'rgba(239, 68, 68, 0.1)',
                            color: acc.color || 'inherit',
                          }}
                        >
                          {getAccountIcon(acc.accountType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm">{acc.name}</p>
                            {acc.color && (
                              <span 
                                className="inline-block w-2 h-2 rounded-full" 
                                style={{ backgroundColor: acc.color }} 
                              />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground capitalize">{acc.accountType.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {/* Note: Credit cards usually have negative ledger balances representing debt. */}
                        <Amount valueMinor={acc.balanceMinor} currency={acc.currency} colorize="default" className="font-medium" />
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
                  <div key={txn.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {txn.description || (txn.transactionType === 'expense' ? 'Expense' : txn.transactionType === 'income' ? 'Income' : 'Transfer')}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 truncate">
                        <span>{new Date(txn.transactionDate).toLocaleDateString()}</span>
                        {txn.category && (
                          <>
                            <span>&bull;</span>
                            <span className="truncate">{txn.category.name}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0 whitespace-nowrap pl-2">
                      {/* For expense, show negative if we want, or just let colorize handle it based on type */}
                      <Amount 
                        valueMinor={txn.transactionType === 'expense' || txn.transactionType === 'credit_card_purchase' ? -txn.amountMinor : txn.amountMinor} 
                        colorize="default" 
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
