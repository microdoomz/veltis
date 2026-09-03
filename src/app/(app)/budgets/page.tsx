import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getBudgetsWithActuals } from "@/lib/ledger/budget"
import { getCategories } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Amount } from "@/components/ui/amount"
import { addBudgetAction, deleteBudgetAction } from "@/app/actions/budget"

export default async function BudgetsPage() {
  const authContext = await requireWorkspaceAccess()
  
  const [budgets, categories] = await Promise.all([
    getBudgetsWithActuals(authContext.workspaceId),
    getCategories(authContext.workspaceId)
  ])

  // Filter only expense/both categories
  const expenseCategories = categories.filter(c => c.categoryType === 'expense' || c.categoryType === 'both')

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Budgets</h1>
        <p className="text-muted-foreground text-sm">Track your spending against limits.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {budgets.map(budget => (
          <Card key={budget.id} className="p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{budget.categoryName}</h3>
                <p className="text-xs text-muted-foreground">{budget.periodStartDate} to {budget.periodEndDate}</p>
              </div>
              <form action={async () => {
                "use server"
                await deleteBudgetAction(authContext.workspaceId, budget.id)
              }}>
                <Button type="submit" variant="ghost" size="sm" className="h-8 text-destructive">Delete</Button>
              </form>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Spent: <Amount valueMinor={budget.spentMinor} colorize="none" /></span>
                <span className="text-muted-foreground">Total: <Amount valueMinor={budget.amountMinor} colorize="none" /></span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${budget.remainingMinor < 0 ? 'bg-destructive' : 'bg-primary'}`} 
                  style={{ width: `${Math.min(100, Number(budget.spentMinor * 100n / (budget.amountMinor || 1n)))}%` }} 
                />
              </div>
              <div className="text-xs text-right mt-1 text-muted-foreground">
                <Amount valueMinor={budget.remainingMinor} colorize="none" /> remaining
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 mt-8">
        <h2 className="text-lg font-semibold mb-4">Create New Budget</h2>
        <form action={addBudgetAction.bind(null, authContext.workspaceId)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
              <select 
                name="categoryId" 
                required 
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {expenseCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Limit Amount</label>
              <Input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Start Date</label>
              <Input name="periodStartDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">End Date</label>
              <Input name="periodEndDate" type="date" required />
            </div>
          </div>
          <Button type="submit" className="w-full">Create Budget</Button>
        </form>
      </Card>
    </div>
  )
}
