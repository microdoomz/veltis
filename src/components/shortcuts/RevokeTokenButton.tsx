"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { deleteShortcutTokenAction } from "@/app/actions/shortcut"
import { Loader2 } from "lucide-react"

export function RevokeTokenButton({
  workspaceId,
  tokenId,
}: {
  workspaceId: string
  tokenId: string
}) {
  const [isPending, startTransition] = useTransition()

  const handleRevoke = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("tokenId", tokenId)
      await deleteShortcutTokenAction(workspaceId, formData)
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      onClick={handleRevoke}
      disabled={isPending}
      className="text-destructive hover:bg-destructive/10 h-8 px-3 rounded-lg text-xs font-medium"
    >
      {isPending ? (
        <>
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          Revoking...
        </>
      ) : (
        "Revoke"
      )}
    </Button>
  )
}
