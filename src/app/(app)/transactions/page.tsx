import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getRecentTransactions } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import { Amount } from "@/components/ui/amount"
import Link from "next/link"
import { Plus, ReceiptText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ListContainer, ListItem } from "@/components/ui/transitions"

export default async function TransactionsPage(
  props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const authContext = await requireWorkspaceAccess()
  const searchParams = await props.searchParams
  const categoryFilter = searchParams?.category as string | undefined
  
  // Fetch up to 50 for the main list for now
  const transactions = await getRecentTransactions(authContext.workspaceId, 50, categoryFilter)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Transactions</h1>
          <p className="text-muted-foreground">Your transaction history.</p>
        </div>
        <Link href="/transactions/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </Link>
      </header>

      <Card className="elevation-low overflow-hidden">
        {transactions.length === 0 ? (
          <EmptyState 
            icon={ReceiptText}
            title="No transactions yet" 
            description="Add your first expense or income to start tracking."
            action={
              <Link href="/transactions/new">
                <Button><Plus className="w-4 h-4 mr-2" /> Add Transaction</Button>
              </Link>
            }
          />
        ) : (
          <>
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-[2fr,1fr,1fr,1fr,auto] gap-4 p-4 border-b border-border bg-muted/20 text-sm font-medium text-muted-foreground">
              <div>Description</div>
              <div>Category</div>
              <div>Account</div>
              <div>Date</div>
              <div className="text-right">Amount</div>
            </div>
            
            <ListContainer className="divide-y divide-border">
              {transactions.map((txn) => (
                <ListItem key={txn.id} className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr,1fr,auto] gap-2 md:gap-4 p-4 items-center hover:bg-muted/50 transition-colors">
                  {/* Mobile Top Row / Desktop Col 1 */}
                  <div className="flex justify-between md:block">
                    <p className="font-medium text-sm">
                      {txn.description || (txn.transactionType === 'expense' ? 'Expense' : txn.transactionType === 'income' ? 'Income' : 'Transfer')}
                    </p>
                    {/* Mobile Amount */}
                    <div className="md:hidden text-right flex flex-col items-end">
                      <Amount 
                        valueMinor={txn.transactionType === 'expense' || txn.transactionType === 'credit_card_purchase' ? -txn.amountMinor : txn.amountMinor} 
                        currency={txn.currency}
                        colorize="inverted" 
                        showSign={true}
                        className="font-medium" 
                      />
                      <span className="text-[10px] text-muted-foreground capitalize mt-1 opacity-70">
                        {txn.source}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Meta / Desktop Cols 2-4 */}
                  <div className="text-xs text-muted-foreground flex items-center gap-2 md:contents">
                    {/* Desktop Category */}
                    <div className="hidden md:flex items-center">
                      {txn.category && (
                        <span className="bg-muted px-2 py-1 rounded text-[10px] uppercase font-medium">{txn.category.name}</span>
                      )}
                    </div>
                    {/* Desktop Account */}
                    <div className="hidden md:block truncate">
                      {txn.legs.length > 0 && txn.legs[0].account?.name}
                    </div>
                    {/* Desktop Date */}
                    <div className="hidden md:block">
                      {new Date(txn.transactionDate).toLocaleDateString()}
                    </div>
                    
                    {/* Mobile Inline Meta */}
                    <span className="md:hidden">{new Date(txn.transactionDate).toLocaleDateString()}</span>
                    {txn.category && (
                      <span className="md:hidden bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-medium">{txn.category.name}</span>
                    )}
                    {txn.legs.length > 0 && (
                      <span className="md:hidden">&bull; {txn.legs[0].account?.name}</span>
                    )}
                  </div>

                  {/* Desktop Amount */}
                  <div className="hidden md:flex flex-col items-end justify-center text-right">
                    <Amount 
                      valueMinor={txn.transactionType === 'expense' || txn.transactionType === 'credit_card_purchase' ? -txn.amountMinor : txn.amountMinor} 
                      currency={txn.currency}
                      colorize="inverted" 
                      showSign={true}
                      className="font-medium text-sm" 
                    />
                    <span className="text-[10px] text-muted-foreground capitalize mt-1 opacity-70">
                      {txn.source}
                    </span>
                  </div>
                </ListItem>
              ))}
            </ListContainer>
          </>
        )}
      </Card>
    </div>
  )
}
