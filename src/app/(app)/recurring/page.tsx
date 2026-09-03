import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getRecurringItemsWithOccurrences } from "@/lib/services/recurring"
import { getCategories, getAccountSummary } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Amount } from "@/components/ui/amount"
import { addRecurringAction, confirmOccurrenceAction } from "@/app/actions/recurring"

export default async function RecurringPage() {
  const authContext = await requireWorkspaceAccess()
  
  const [items, categories, accounts] = await Promise.all([
    getRecurringItemsWithOccurrences(authContext.workspaceId),
    getCategories(authContext.workspaceId),
    getAccountSummary(authContext.workspaceId)
  ])

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Recurring Items</h1>
        <p className="text-muted-foreground text-sm">Manage bills and subscriptions.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map(item => (
          <Card key={item.id} className="p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <p className="text-xs text-muted-foreground capitalize">{item.type} &bull; Day {item.customDay}</p>
              </div>
              <Amount 
                valueMinor={item.type === 'expense' ? -item.expectedAmountMinor : item.expectedAmountMinor} 
                colorize="inverted" 
                showSign={true} 
              />
            </div>
            
            {item.pendingOccurrences.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Pending Occurrences</p>
                {item.pendingOccurrences.map(occ => (
                  <div key={occ.id} className="flex justify-between items-center bg-muted/50 p-2 rounded text-sm">
                    <span>{occ.expectedDate}</span>
                    <form action={confirmOccurrenceAction.bind(null, authContext.workspaceId)} className="flex gap-2">
                      <input type="hidden" name="occurrenceId" value={occ.id} />
                      <select name="accountId" required defaultValue={item.defaultAccountId || ""} className="h-8 rounded text-xs border border-border">
                        <option value="">Select Account</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <Button type="submit" size="sm" className="h-8 text-xs">Confirm</Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-6 mt-8">
        <h2 className="text-lg font-semibold mb-4">Add Recurring Item</h2>
        <form action={addRecurringAction.bind(null, authContext.workspaceId)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Type</label>
              <select name="type" className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Name / Merchant</label>
              <Input name="name" required placeholder="Netflix" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Amount</label>
              <Input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Day of Month</label>
              <Input name="customDay" type="number" min="1" max="31" required defaultValue="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
              <select name="categoryId" className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <option value="">Select Category (Optional)</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Default Account</label>
              <select name="defaultAccountId" className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <option value="">Select Account (Optional)</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
          </div>
          <Button type="submit" className="w-full">Create Recurring Item</Button>
        </form>
      </Card>
    </div>
  )
}
