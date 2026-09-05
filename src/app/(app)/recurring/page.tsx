import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getRecurringItemsWithOccurrences } from "@/lib/services/recurring"
import { getCategories, getAccountSummary } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Amount } from "@/components/ui/amount"
import { addRecurringAction, confirmOccurrenceAction } from "@/app/actions/recurring"
import { Repeat, Calendar, CheckCircle2, AlertCircle } from "lucide-react"

export default async function RecurringPage() {
  const authContext = await requireWorkspaceAccess()
  
  const [items, categories, accounts] = await Promise.all([
    getRecurringItemsWithOccurrences(authContext.workspaceId),
    getCategories(authContext.workspaceId),
    getAccountSummary(authContext.workspaceId)
  ])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <Repeat className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Recurring Items &amp; SIPs</h1>
        </div>
        <p className="text-muted-foreground text-sm">Manage recurring bills, subscriptions, and monthly SIP reviews.</p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {items.map(item => (
          <Card key={item.id} className="p-5 space-y-4 border border-border/80 shadow-sm rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">{item.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">
                    {item.type} &bull; Monthly (Day {item.customDay || 1})
                  </p>
                </div>
                <Amount 
                  valueMinor={item.type === 'expense' ? -item.expectedAmountMinor : item.expectedAmountMinor} 
                  colorize="inverted" 
                  showSign={true} 
                  className="text-base font-bold"
                />
              </div>
              
              {item.pendingOccurrences.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Pending Reviews ({item.pendingOccurrences.length})
                    </p>
                    <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Due for Review
                    </span>
                  </div>

                  {item.pendingOccurrences.map(occ => (
                    <div 
                      key={occ.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 border border-border/60 p-3 rounded-xl"
                    >
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="whitespace-nowrap font-semibold text-xs sm:text-sm text-foreground font-mono">
                          {occ.expectedDate}
                        </span>
                      </div>
                      <form action={confirmOccurrenceAction.bind(null, authContext.workspaceId)} className="flex items-center gap-2 flex-1 sm:justify-end min-w-0">
                        <input type="hidden" name="occurrenceId" value={occ.id} />
                        <select 
                          name="accountId" 
                          required 
                          defaultValue={item.defaultAccountId || ""} 
                          className="h-9 rounded-lg text-xs border border-border bg-background text-foreground dark:bg-slate-900 dark:text-slate-100 px-2.5 py-1 min-w-[140px] max-w-[220px] truncate focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="" className="bg-background text-foreground dark:bg-slate-900 dark:text-slate-100">
                            Select Account
                          </option>
                          {accounts.map(a => (
                            <option key={a.id} value={a.id} className="bg-background text-foreground dark:bg-slate-900 dark:text-slate-100">
                              {a.name}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" size="sm" className="h-9 px-3 text-xs font-semibold rounded-lg flex-shrink-0 gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirm
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}

        {items.length === 0 && (
          <Card className="col-span-full p-8 text-center border-dashed border-border rounded-2xl">
            <Repeat className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No recurring items or SIPs set up yet.</p>
          </Card>
        )}
      </div>

      <Card className="p-6 mt-8 border border-border/80 rounded-2xl shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Add Recurring Item</h2>
        <form action={addRecurringAction.bind(null, authContext.workspaceId)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Type</label>
              <select name="type" className="flex h-11 w-full rounded-xl border border-border bg-background text-foreground dark:bg-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="expense" className="bg-background text-foreground dark:bg-slate-900 dark:text-slate-100">Expense</option>
                <option value="income" className="bg-background text-foreground dark:bg-slate-900 dark:text-slate-100">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Name / Merchant</label>
              <Input name="name" required placeholder="Netflix, Rent, SIP..." className="h-11" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Amount</label>
              <Input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" className="h-11" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Day of Month</label>
              <Input name="customDay" type="number" min="1" max="31" required defaultValue="1" className="h-11" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Category</label>
              <select name="categoryId" className="flex h-11 w-full rounded-xl border border-border bg-background text-foreground dark:bg-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="" className="bg-background text-foreground dark:bg-slate-900 dark:text-slate-100">Select Category (Optional)</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-background text-foreground dark:bg-slate-900 dark:text-slate-100">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Default Account</label>
              <select name="defaultAccountId" className="flex h-11 w-full rounded-xl border border-border bg-background text-foreground dark:bg-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="" className="bg-background text-foreground dark:bg-slate-900 dark:text-slate-100">Select Account (Optional)</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-background text-foreground dark:bg-slate-900 dark:text-slate-100">
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" className="w-full h-11 rounded-xl font-semibold shadow-sm mt-2">
            Create Recurring Item
          </Button>
        </form>
      </Card>
    </div>
  )
}
