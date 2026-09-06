import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getAccountSummary } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import { Amount } from "@/components/ui/amount"
import { Wallet, CreditCard, Building2, TrendingUp, PiggyBank, Plus, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/ui/empty-state"
import { ListContainer, ListItem } from "@/components/ui/transitions"
import { Button } from "@/components/ui/button"
import { RefreshButton } from "@/components/ui/refresh-button"

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

export default async function AccountsPage() {
  const authContext = await requireWorkspaceAccess()
  const accounts = await getAccountSummary(authContext.workspaceId)

  // Calculate total aggregate balance across active accounts
  const totalBalanceMinor = accounts.reduce((sum, a) => {
    return sum + (a.accountType === 'credit_card' ? -a.balanceMinor : a.balanceMinor)
  }, 0n)

  // Group by type
  const grouped = accounts.reduce((acc, account) => {
    if (!acc[account.accountType]) acc[account.accountType] = []
    acc[account.accountType].push(account)
    return acc
  }, {} as Record<string, typeof accounts>)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Accounts</h1>
          </div>
          <p className="text-muted-foreground">All your linked financial accounts.</p>
        </div>
        <Link href="/accounts/new">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" /> Add Account
          </Button>
        </Link>
      </header>

      {/* Total Aggregate Balance Banner */}
      {accounts.length > 0 && (
        <Card className="p-4 bg-muted/30 border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Aggregate Balance
                </span>
                <RefreshButton size="sm" />
              </div>
              <div className="text-2xl font-bold text-foreground tracking-tight">
                <Amount valueMinor={totalBalanceMinor} currency={accounts[0]?.currency || 'INR'} showSign={false} />
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {accounts.length} linked {accounts.length === 1 ? 'account' : 'accounts'}
          </div>
        </Card>
      )}

      <div className="space-y-8">
        {Object.entries(grouped).map(([type, accs]) => (
          <div key={type} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {type.replace('_', ' ')}
            </h2>
            <ListContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accs.map(acc => (
                <ListItem key={acc.id}>
                  <Link href={`/accounts/${acc.id}`} className="block h-full">
                    <Card 
                      className="h-full elevation-low hover:elevation-medium hover:border-primary/50 transition-all cursor-pointer overflow-hidden"
                      style={{ borderLeft: acc.color ? `4px solid ${acc.color}` : undefined }}
                    >
                      <div className="p-4 flex flex-col justify-between h-full gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div 
                            className="p-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: acc.color ? `${acc.color}20` : 'var(--muted)',
                              color: acc.color || 'inherit',
                            }}
                          >
                            {getAccountIcon(acc.accountType)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="font-medium text-sm truncate" title={acc.name}>{acc.name}</p>
                              {acc.color && (
                                <span 
                                  className="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-background shrink-0" 
                                  style={{ backgroundColor: acc.color }} 
                                  title="Accent Color"
                                />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{acc.institutionName || 'Manual Account'}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-end gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">Total Balance</span>
                          <Amount valueMinor={acc.balanceMinor} currency={acc.currency} className="font-semibold text-lg shrink-0 whitespace-nowrap" colorize="default" />
                        </div>

                        {acc.allocations && acc.allocations.length > 0 && (
                          <div className="pt-2.5 border-t border-border/60 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                <PiggyBank className="w-3.5 h-3.5 text-amber-500" />
                                Set Aside ({acc.allocations.length})
                              </span>
                              <Amount valueMinor={acc.totalAllocatedMinor} currency={acc.currency} className="font-medium text-amber-600 dark:text-amber-400 text-xs" />
                            </div>

                            {/* Allocations Breakdown */}
                            <div className="flex flex-wrap gap-1">
                              {acc.allocations.map((al) => (
                                <span
                                  key={al.id}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 border border-border/60 text-foreground flex items-center gap-1"
                                  title={al.description || al.name}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: al.color || '#F59E0B' }} />
                                  <span className="truncate max-w-[100px]">{al.name}:</span>
                                  <Amount valueMinor={BigInt(al.amountMinor)} currency={acc.currency} className="font-medium" />
                                </span>
                              ))}
                            </div>

                            <div className="flex justify-between items-center text-xs pt-1 border-t border-border/40">
                              <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                Free to Spend
                              </span>
                              <Amount valueMinor={acc.freeToSpendMinor} currency={acc.currency} className="font-bold text-emerald-600 dark:text-emerald-400 text-xs" />
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </Link>
                </ListItem>
              ))}
            </ListContainer>
          </div>
        ))}

        {accounts.length === 0 && (
          <EmptyState 
            icon={Wallet}
            title="No accounts yet"
            description="Add an account to start tracking your wealth."
            action={
              <Link href="/accounts/new">
                <Button><Plus className="w-4 h-4 mr-2" /> Add Account</Button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  )
}
