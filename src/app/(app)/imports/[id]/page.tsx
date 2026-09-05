import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { getImportWithRows } from "@/lib/services/import"
import { getCategories } from "@/lib/ledger/queries"
import { ImportReviewView } from "@/components/imports/ImportReviewView"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function ImportReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authContext = await requireWorkspaceAccess()
  
  const [importRecord, categories] = await Promise.all([
    getImportWithRows(id, authContext.workspaceId),
    getCategories(authContext.workspaceId)
  ])

  if (!importRecord) notFound()

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <Link
          href="/imports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Statement Imports
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Review Import: {importRecord.originalFilename}
        </h1>
        <p className="text-muted-foreground text-sm">
          Review, categorize, and commit statement rows to your ledger.
        </p>
      </header>

      <ImportReviewView
        workspaceId={authContext.workspaceId}
        importRecord={importRecord}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  )
}

