import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getAccountSummary } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import { Amount } from "@/components/ui/amount"
import { Wallet, CreditCard, Building2, TrendingUp, PiggyBank, Plus } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/ui/empty-state"
import { ListContainer, ListItem } from "@/components/ui/transitions"
import { Button } from "@/components/ui/button"

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
          <h1 className="text-2xl font-bold tracking-tight text-primary">Accounts</h1>
          <p className="text-muted-foreground">All your linked financial accounts.</p>
        </div>
        <Link href="/accounts/new">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" /> Add Account
          </Button>
        </Link>
      </header>

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
                    <Card className="h-full elevation-low hover:elevation-medium hover:border-primary/50 transition-all cursor-pointer">
                      <div className="p-4 flex flex-col justify-between h-full gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-full">
                            {getAccountIcon(acc.accountType)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{acc.name}</p>
                            <p className="text-xs text-muted-foreground">{acc.institutionName || 'Manual Account'}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-end">
                          <span className="text-xs text-muted-foreground">Balance</span>
                          <Amount valueMinor={acc.balanceMinor} className="font-semibold text-lg" colorize="default" />
                        </div>
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
