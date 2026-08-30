import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getImports } from "@/lib/services/import"
import { getAccountSummary } from "@/lib/ledger/queries"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadImportAction } from "@/app/actions/import"
import Link from "next/link"

export default async function ImportsPage() {
  const authContext = await requireWorkspaceAccess()
  
  const [imports, accounts] = await Promise.all([
    getImports(authContext.workspaceId),
    getAccountSummary(authContext.workspaceId)
  ])

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Statement Imports</h1>
        <p className="text-muted-foreground text-sm">Upload CSV files from your bank.</p>
      </header>

      <Card className="p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">New Import</h2>
        <form action={uploadImportAction} className="flex gap-4 items-end">
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
