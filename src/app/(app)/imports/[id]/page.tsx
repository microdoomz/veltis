import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getImportWithRows } from "@/lib/services/import"
import { getCategories } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Amount } from "@/components/ui/amount"
import { reviewRowAction } from "@/app/actions/import"
import { notFound } from "next/navigation"

export default async function ImportReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authContext = await requireWorkspaceAccess()
  
  const [importRecord, categories] = await Promise.all([
    getImportWithRows(id, authContext.workspaceId),
    getCategories(authContext.workspaceId)
  ])

  if (!importRecord) notFound()

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Review Import: {importRecord.originalFilename}</h1>
        <p className="text-muted-foreground text-sm">Review each row before committing to the ledger.</p>
      </header>

      <div className="space-y-4">
        {importRecord.rows.map(row => (
          <Card key={row.id} className={`p-4 flex flex-col gap-4 ${row.duplicateStatus !== 'none' ? 'border-destructive' : ''} ${row.reviewStatus !== 'pending' ? 'opacity-50' : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{row.transactionDate}</p>
                <p className="text-sm">{row.description}</p>
                {row.duplicateStatus !== 'none' && (
                  <p className="text-xs text-destructive font-semibold uppercase mt-1">Possible Duplicate</p>
                )}
              </div>
              <Amount valueMinor={row.direction === 'debit' ? -row.amountMinor : row.amountMinor} currency={row.currency} colorize="inverted" showSign={true} />
            </div>

            {row.reviewStatus === 'pending' ? (
              <form action={reviewRowAction.bind(null, authContext.workspaceId)} className="flex gap-2 bg-muted/30 p-2 rounded items-end">
                <input type="hidden" name="rowId" value={row.id} />
                <input type="hidden" name="importId" value={importRecord.id} />
                
                <div className="flex-1">
                  <select name="categoryId" className="w-full h-8 rounded text-xs border border-border">
                    <option value="">Select Category (Optional)</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                <Button type="submit" name="action" value="commit" size="sm" className="h-8">Commit</Button>
                <Button type="submit" name="action" value="reject" variant="outline" size="sm" className="h-8 text-destructive border-destructive hover:bg-destructive/10">Reject</Button>
              </form>
            ) : (
              <div className="bg-muted p-2 rounded text-xs font-semibold uppercase">
                Status: {row.reviewStatus}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
