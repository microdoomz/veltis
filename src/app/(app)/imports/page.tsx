import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getImports } from "@/lib/services/import"
import { getAccountSummary } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NewImportForm } from "@/components/imports/NewImportForm"
import { DeleteImportBatchButton } from "@/components/imports/DeleteImportBatchButton"
import Link from "next/link"
import { AlertCircle, FileSpreadsheet } from "lucide-react"

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const authContext = await requireWorkspaceAccess()
  
  const [imports, accounts] = await Promise.all([
    getImports(authContext.workspaceId),
    getAccountSummary(authContext.workspaceId)
  ])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Statement Imports</h1>
        <p className="text-muted-foreground text-sm">Upload CSV bank statements to reconcile and import transactions.</p>
      </header>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Import Error</p>
            <p className="text-xs leading-relaxed">{decodeURIComponent(error)}</p>
            <p className="text-[11px] text-destructive/80 mt-1">
              Tip: Make sure your CSV has column headers for <strong>Date</strong> (e.g. YYYY-MM-DD or DD/MM/YYYY) and <strong>Amount</strong> (or Debit and Credit).
            </p>
          </div>
        </div>
      )}

      <Card className="p-6 mb-8 border border-border/80 shadow-sm rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Upload New Statement</h2>
        </div>
        <NewImportForm
          workspaceId={authContext.workspaceId}
          accounts={accounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            currency: acc.currency,
          }))}
        />
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Previous Imports</h2>
        <div className="space-y-3">
          {imports.map(imp => (
            <Card key={imp.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-muted/30 border border-border/80 rounded-xl transition-colors">
              <div className="space-y-1">
                <p className="font-medium text-foreground">{imp.originalFilename}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(imp.createdAt).toLocaleString()} &bull; <span className="capitalize font-medium text-foreground/80">{imp.status}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <Link href={`/imports/${imp.id}`}>
                  <Button variant="outline" size="sm" className="rounded-lg h-9">
                    Review Rows
                  </Button>
                </Link>
                <DeleteImportBatchButton
                  workspaceId={authContext.workspaceId}
                  importId={imp.id}
                  filename={imp.originalFilename}
                />
              </div>
            </Card>
          ))}
          {imports.length === 0 && (
            <Card className="p-8 text-center border-dashed border-border rounded-xl">
              <p className="text-sm text-muted-foreground">No statement imports recorded yet.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

