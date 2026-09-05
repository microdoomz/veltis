"use server"

import { requireStrictWorkspaceAccess } from "@/lib/auth/guards"
import { softDeleteTransaction, updateTransaction } from "@/lib/services/transaction"
import { getTransactionById } from "@/lib/ledger/queries"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateTransactionAction(workspaceId: string, formData: FormData) {
  const authContext = await requireStrictWorkspaceAccess(workspaceId)
  
  const transactionId = formData.get("transactionId") as string
  const description = formData.get("description") as string
  const merchantName = (formData.get("merchantName") as string) || undefined
  const categoryId = (formData.get("categoryId") as string) || undefined
  const dateStr = formData.get("date") as string
  const amountStr = formData.get("amount") as string
  const accountId = (formData.get("accountId") as string) || undefined

  if (!transactionId) {
    throw new Error("Transaction ID is required")
  }

  let amountMinor: bigint | undefined
  if (amountStr && !isNaN(parseFloat(amountStr))) {
    amountMinor = BigInt(Math.round(parseFloat(amountStr) * 100))
  }

  let transactionDate: Date | undefined
  if (dateStr) {
    transactionDate = new Date(dateStr)
  }

  await updateTransaction({
    transactionId,
    workspaceId: authContext.workspaceId,
    description: description?.trim() || undefined,
    merchantName: merchantName?.trim() || undefined,
    categoryId: categoryId === 'none' ? null : categoryId,
    amountMinor,
    transactionDate,
    accountId,
  })

  revalidatePath("/home")
  revalidatePath("/transactions")
  revalidatePath(`/transactions/${transactionId}`)
  revalidatePath("/accounts")
}

export async function deleteTransactionAction(workspaceId: string, transactionId: string) {
  const authContext = await requireStrictWorkspaceAccess(workspaceId)
  
  // Verify ownership before deleting
  const txn = await getTransactionById(authContext.workspaceId, transactionId)
  if (!txn) {
    throw new Error("Transaction not found or unauthorized")
  }

  await softDeleteTransaction(transactionId)

  revalidatePath("/home")
  revalidatePath("/transactions")
  revalidatePath("/accounts")
  redirect("/transactions")
}
