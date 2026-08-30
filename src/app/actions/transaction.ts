"use server"

import { requireUser, requireWorkspaceAccess } from "@/lib/auth/guards"
import { createExpense, createIncome, createTransfer, softDeleteTransaction } from "@/lib/services/transaction"
import { getTransactionById } from "@/lib/ledger/queries"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

const baseSchema = z.object({
  amountMajor: z.coerce.number().positive("Amount must be positive"),
  accountId: z.string().min(1, "Account is required"),
  transactionDate: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
})

const transferSchema = z.object({
  amountMajor: z.coerce.number().positive("Amount must be positive"),
  sourceAccountId: z.string().min(1, "Source account is required"),
  destAccountId: z.string().min(1, "Destination account is required"),
  transactionDate: z.string().min(1, "Date is required"),
  description: z.string().optional(),
})

export async function addExpenseAction(formData: FormData) {
  const authContext = await requireWorkspaceAccess()
  const userContext = await requireUser()
  
  const parsed = baseSchema.parse({
    amountMajor: formData.get("amount"),
    accountId: formData.get("accountId"),
    transactionDate: formData.get("transactionDate"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId") || undefined,
  })

  // Convert to minor units (INR)
  const amountMinor = BigInt(Math.round(parsed.amountMajor * 100))

  await createExpense({
    workspaceId: authContext.workspaceId,
    createdByUserId: userContext.user.id,
    amountMinor,
    currency: "INR",
    transactionDate: new Date(parsed.transactionDate),
    description: parsed.description,
    categoryId: parsed.categoryId,
    accountId: parsed.accountId
  })

  revalidatePath("/home")
  revalidatePath("/transactions")
  revalidatePath("/accounts")
}

export async function addIncomeAction(formData: FormData) {
  const authContext = await requireWorkspaceAccess()
  const userContext = await requireUser()
  
  const parsed = baseSchema.parse({
    amountMajor: formData.get("amount"),
    accountId: formData.get("accountId"),
    transactionDate: formData.get("transactionDate"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId") || undefined,
  })

  const amountMinor = BigInt(Math.round(parsed.amountMajor * 100))

  await createIncome({
    workspaceId: authContext.workspaceId,
    createdByUserId: userContext.user.id,
    amountMinor,
    currency: "INR",
    transactionDate: new Date(parsed.transactionDate),
    description: parsed.description,
    categoryId: parsed.categoryId,
    accountId: parsed.accountId
  })

  revalidatePath("/home")
  revalidatePath("/transactions")
  revalidatePath("/accounts")
}

export async function addTransferAction(formData: FormData) {
  const authContext = await requireWorkspaceAccess()
  const userContext = await requireUser()
  
  const parsed = transferSchema.parse({
    amountMajor: formData.get("amount"),
    sourceAccountId: formData.get("sourceAccountId"),
    destAccountId: formData.get("destAccountId"),
    transactionDate: formData.get("transactionDate"),
    description: formData.get("description"),
  })

  const amountMinor = BigInt(Math.round(parsed.amountMajor * 100))

  await createTransfer({
    workspaceId: authContext.workspaceId,
    createdByUserId: userContext.user.id,
    amountMinor,
    currency: "INR",
    transactionDate: new Date(parsed.transactionDate),
    description: parsed.description,
    sourceAccountId: parsed.sourceAccountId,
    destAccountId: parsed.destAccountId
  })

  revalidatePath("/home")
  revalidatePath("/transactions")
  revalidatePath("/accounts")
}

export async function deleteTransactionAction(transactionId: string) {
  const authContext = await requireWorkspaceAccess()
  
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
