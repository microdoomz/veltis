import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getAccountById } from "@/lib/ledger/queries"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ReconcileForm } from "./reconcile-form"

export default async function ReconcilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authContext = await requireWorkspaceAccess()
  
  const account = await getAccountById(authContext.workspaceId, id)
  if (!account) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link href={`/accounts/${account.id}`} className="text-muted-foreground text-sm hover:text-foreground hover:underline">
            &larr; Back to {account.name}
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Reconcile Account</h1>
        <p className="text-muted-foreground">
          Compare your actual bank balance with Veltis to ensure accuracy.
        </p>
      </header>

      <ReconcileForm 
        accountId={account.id}
        workspaceId={authContext.workspaceId}
        calculatedBalanceMinor={account.balanceMinor}
        currency={account.currency}
      />
    </div>
  )
}
