import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getImports } from "@/lib/services/import"
import { getAccountSummary } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadImportAction } from "@/app/actions/import"
import Link from "next/link"

import { AlertCircle } from "lucide-react"

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
    <div className="space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Statement Imports</h1>
        <p className="text-muted-foreground text-sm">Upload CSV bank statements to reconcile and import transactions.</p>
      </header>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm flex items-start gap-3">
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

      <Card className="p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">New Import</h2>
        <form action={uploadImportAction.bind(null, authContext.workspaceId)} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-muted-foreground mb-1">Account</label>
            <select name="accountId" required className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="">Select Account</option>
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-muted-foreground mb-1">CSV File</label>
            <Input name="file" type="file" accept=".csv" required />
          </div>
          <Button type="submit">Upload & Parse</Button>
        </form>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Previous Imports</h2>
        {imports.map(imp => (
          <Card key={imp.id} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors">
            <div>
              <p className="font-medium">{imp.originalFilename}</p>
              <p className="text-xs text-muted-foreground">{new Date(imp.createdAt).toLocaleString()} &bull; Status: {imp.status}</p>
            </div>
            <Link href={`/imports/${imp.id}`}>
              <Button variant="outline" size="sm">Review Rows</Button>
            </Link>
          </Card>
        ))}
        {imports.length === 0 && <p className="text-sm text-muted-foreground">No imports yet.</p>}
      </div>
    </div>
  )
}
