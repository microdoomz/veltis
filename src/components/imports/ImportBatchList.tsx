"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DeleteImportBatchButton } from "@/components/imports/DeleteImportBatchButton"
import Link from "next/link"
import { CheckCircle2, Clock, FileSpreadsheet, Loader2 } from "lucide-react"

export interface ImportBatchItem {
  id: string
  originalFilename: string
  status: string
  createdAt: Date | string
}

export function ImportBatchList({
  initialImports,
  workspaceId,
}: {
  initialImports: ImportBatchItem[]
  workspaceId: string
}) {
  const router = useRouter()
  const [imports, setImports] = useState<ImportBatchItem[]>(initialImports)

  // Sync state if initialImports changes
  useEffect(() => {
    setImports(initialImports)
  }, [initialImports])

  // If any import is currently processing, poll periodically
  const hasProcessing = imports.some((imp) => imp.status === "processing")
  useEffect(() => {
    if (!hasProcessing) return

    const interval = setInterval(() => {
      router.refresh()
    }, 2500)

    return () => clearInterval(interval)
  }, [hasProcessing, router])

  const handleDeleted = (id: string) => {
    // Instant optimistic removal from UI without waiting for refresh
    setImports((prev) => prev.filter((item) => item.id !== id))
  }

  if (imports.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed border-border rounded-xl">
        <FileSpreadsheet className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No statement imports recorded yet.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {imports.map((imp) => (
        <Card
          key={imp.id}
          className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-muted/30 border border-border/80 rounded-xl transition-all duration-200 animate-in fade-in"
        >
          <div className="space-y-1">
            <p className="font-medium text-foreground">{imp.originalFilename}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{new Date(imp.createdAt).toLocaleString()}</span>
              <span>&bull;</span>
              <span className="capitalize font-medium flex items-center gap-1">
                {imp.status === "processing" ? (
                  <span className="text-primary flex items-center gap-1.5 font-medium animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" /> Processing in Background...
                  </span>
                ) : imp.status === "review" ? (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Ready for Review
                  </span>
                ) : imp.status === "confirmed" ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Reconciled
                  </span>
                ) : (
                  imp.status
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Link href={`/imports/${imp.id}`}>
              <Button variant="outline" size="sm" className="rounded-lg h-9">
                Review Rows
              </Button>
            </Link>
            <DeleteImportBatchButton
              workspaceId={workspaceId}
              importId={imp.id}
              filename={imp.originalFilename}
              onDeleted={handleDeleted}
            />
          </div>
        </Card>
      ))}
    </div>
  )
}
