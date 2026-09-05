"use server"

import { requireStrictWorkspaceAccess } from "@/lib/auth/guards"
import { processCsvImport, commitImportRow, rejectImportRow } from "@/lib/services/import"
import { checkRateLimit } from "@/lib/security/rate-limit"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function uploadImportAction(workspaceId: string, formData: FormData) {
  const authContext = await requireStrictWorkspaceAccess(workspaceId)
  
  const file = formData.get("file") as File
  const accountId = formData.get("accountId") as string

  if (!file || !accountId || !file.name) {
    redirect(`/imports?error=${encodeURIComponent('Please select both an account and a CSV file.')}`)
  }

  const rateLimit = await checkRateLimit(`import:user:${authContext.session.user.id}`, 10, 60)
  if (!rateLimit.success) {
    redirect(`/imports?error=${encodeURIComponent('Rate limit exceeded. Please wait a moment before trying again.')}`)
  }

  let importId: string
  try {
    const text = await file.text()
    const importRecord = await processCsvImport(
      text,
      file.name,
      authContext.workspaceId,
      accountId,
      authContext.session.user.id
    )
    importId = importRecord.id
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to parse CSV statement'
    redirect(`/imports?error=${encodeURIComponent(message)}`)
  }

  revalidatePath("/imports")
  redirect(`/imports/${importId}`)
}

export async function reviewRowAction(workspaceId: string, formData: FormData) {
  const authContext = await requireStrictWorkspaceAccess(workspaceId)
  
  const rowId = formData.get("rowId") as string
  const action = formData.get("action") as string // "commit" | "reject"
  const categoryId = formData.get("categoryId") as string
  const importId = formData.get("importId") as string

  if (action === "commit") {
    await commitImportRow(
      rowId, 
      authContext.workspaceId, 
      authContext.session.user.id,
      categoryId || undefined
    )
  } else if (action === "reject") {
    await rejectImportRow(rowId, authContext.workspaceId)
  }

  revalidatePath(`/imports/${importId}`)
  revalidatePath(`/transactions`)
}
