import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getAccountSummary } from "@/lib/ledger/queries"
import { db } from "@/lib/db"
import { workspace } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Card } from "@/components/ui/card"
import { Amount } from "@/components/ui/amount"
import { Wallet, Plus } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { RefreshButton } from "@/components/ui/refresh-button"
import { AccountsList } from "@/components/accounts/AccountsList"

export default async function AccountsPage() {
  const authContext = await requireWorkspaceAccess()
  const [accounts, currentWorkspace] = await Promise.all([
    getAccountSummary(authContext.workspaceId),
    db.query.workspace.findFirst({
      where: eq(workspace.id, authContext.workspaceId),
      columns: {
        accountTypeOrder: true,
      },
    }),
  ]);

  // Calculate total aggregate balance across active accounts
  const totalBalanceMinor = accounts.reduce((sum, a) => {
    return sum + (a.accountType === 'credit_card' ? -a.balanceMinor : a.balanceMinor)
  }, 0n)

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

      {accounts.length > 0 ? (
        <AccountsList
          workspaceId={authContext.workspaceId}
          initialAccounts={accounts}
          savedAccountTypeOrder={currentWorkspace?.accountTypeOrder}
        />
      ) : (
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
  )
}
