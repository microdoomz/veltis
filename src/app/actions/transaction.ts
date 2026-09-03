"use server"

import { requireStrictWorkspaceAccess } from "@/lib/auth/guards"
import { softDeleteTransaction } from "@/lib/services/transaction"
import { getTransactionById } from "@/lib/ledger/queries"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

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
