"use server"

import { requireWorkspaceAccess } from "@/lib/auth/guards"
import { createBudget, deleteBudget } from "@/lib/services/budget"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const budgetFormSchema = z.object({
  categoryId: z.string().uuid(),
  amountStr: z.string().min(1),
  periodStartDate: z.string(),
  periodEndDate: z.string(),
})

export async function addBudgetAction(formData: FormData) {
  const authContext = await requireWorkspaceAccess()
  
  const parsed = budgetFormSchema.parse({
    categoryId: formData.get("categoryId"),
    amountStr: formData.get("amount"),
    periodStartDate: formData.get("periodStartDate"),
    periodEndDate: formData.get("periodEndDate"),
  })

  // Parse standard major unit amount to minor units (e.g. 10.50 -> 1050n)
  // Assuming default currency is USD/EUR/INR with 2 decimals for now.
  const amountMinor = BigInt(Math.round(parseFloat(parsed.amountStr) * 100))

  await createBudget({
    workspaceId: authContext.workspaceId,
    categoryId: parsed.categoryId,
    amountMinor,
    currency: authContext.session.user.id ? 'USD' : 'USD', // Simplified for now
    periodStartDate: parsed.periodStartDate,
    periodEndDate: parsed.periodEndDate,
  })

  revalidatePath("/budgets")
}

export async function deleteBudgetAction(budgetId: string) {
  const authContext = await requireWorkspaceAccess()
  await deleteBudget(authContext.workspaceId, budgetId)
  revalidatePath("/budgets")
}
