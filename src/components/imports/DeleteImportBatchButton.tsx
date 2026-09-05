"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { deleteImportBatchAction } from "@/app/actions/import"
import { Trash2, Loader2 } from "lucide-react"

export function DeleteImportBatchButton({
  workspaceId,
  importId,
  filename,
  onDeleted,
}: {
  workspaceId: string
  importId: string
  filename: string
  onDeleted?: (importId: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = () => {
    onDeleted?.(importId)
    startTransition(async () => {
      await deleteImportBatchAction(workspaceId, importId)
      setShowConfirm(false)
    })
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive font-medium">Delete batch &amp; rows?</span>
        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
          className="h-8 px-2.5 text-xs rounded-lg"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="h-8 px-2.5 text-xs rounded-lg"
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setShowConfirm(true)}
      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 px-2.5 rounded-lg transition-colors"
      title={`Delete ${filename}`}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  )
}
