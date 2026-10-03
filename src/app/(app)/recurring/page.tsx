import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getRecurringItemsWithOccurrences } from "@/lib/services/recurring"
import { getCategories, getAccountSummary } from "@/lib/ledger/queries"
import { Repeat } from "lucide-react"
import { RecurringList } from "@/components/recurring/RecurringList"
import { AddRecurringForm } from "@/components/recurring/AddRecurringForm"

export default async function RecurringPage() {
  const authContext = await requireWorkspaceAccess()
  
  const [items, categories, accounts] = await Promise.all([
    getRecurringItemsWithOccurrences(authContext.workspaceId),
    getCategories(authContext.workspaceId),
    getAccountSummary(authContext.workspaceId)
  ])

  // Serialize BigInt values for client component compatibility
  const serializedItems = items.map(item => ({
    ...item,
    expectedAmountMinor: item.expectedAmountMinor.toString(),
    pendingOccurrences: item.pendingOccurrences.map(occ => ({
      ...occ,
      actualAmountMinor: occ.actualAmountMinor ? occ.actualAmountMinor.toString() : null,
    }))
  }))

  const serializedAccounts = accounts.map(a => ({
    id: a.id,
    name: a.name,
    accountType: a.accountType,
    currency: a.currency,
  }))

  const serializedCategories = categories.map(c => ({
    id: c.id,
    name: c.name,
  }))

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <Repeat className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Recurring Items &amp; SIPs</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Automate recurring bills, subscriptions, transfers, and review your monthly SIP investments.
        </p>
      </header>

      {/* Recurring Items & Reviews List */}
      <RecurringList
        workspaceId={authContext.workspaceId}
        items={serializedItems}
        accounts={serializedAccounts}
      />

      {/* Add Recurring Item Form */}
      <AddRecurringForm
        workspaceId={authContext.workspaceId}
        accounts={serializedAccounts}
        categories={serializedCategories}
      />
    </div>
  )
}
