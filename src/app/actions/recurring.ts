"use server"

import { requireStrictWorkspaceAccess } from "@/lib/auth/guards"
import { createRecurringItem, confirmOccurrence } from "@/lib/services/recurring"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const recurringFormSchema = z.object({
  type: z.enum(['income', 'expense']),
  name: z.string().min(1),
  amountStr: z.string().min(1),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  defaultAccountId: z.string().uuid().optional().or(z.literal('')),
  customDay: z.string(),
})

export async function addRecurringAction(workspaceId: string, formData: FormData) {
  const authContext = await requireStrictWorkspaceAccess(workspaceId)
  
  const rawData = {
    type: formData.get("type"),
    name: formData.get("name"),
    amountStr: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    defaultAccountId: formData.get("defaultAccountId"),
    customDay: formData.get("customDay"),
  }
  
  const parsed = recurringFormSchema.parse(rawData)
  const amountMinor = BigInt(Math.round(parseFloat(parsed.amountStr) * 100))

  await createRecurringItem({
    workspaceId: authContext.workspaceId,
    type: parsed.type as 'income' | 'expense',
    name: parsed.name,
    expectedAmountMinor: amountMinor,
    currency: 'USD',
    categoryId: parsed.categoryId === '' ? undefined : parsed.categoryId,
    defaultAccountId: parsed.defaultAccountId === '' ? undefined : parsed.defaultAccountId,
    frequency: 'monthly',
    dayRule: 'custom_day',
    customDay: parseInt(parsed.customDay, 10),
  })

  revalidatePath("/recurring")
}

export async function confirmOccurrenceAction(workspaceId: string, formData: FormData) {
  const authContext = await requireStrictWorkspaceAccess(workspaceId)
  const occurrenceId = formData.get("occurrenceId") as string
  const accountId = formData.get("accountId") as string
  
  await confirmOccurrence(
    occurrenceId, 
    authContext.workspaceId, 
    accountId, 
    authContext.session.user.id
  )

  revalidatePath("/recurring")
  revalidatePath("/transactions")
  revalidatePath("/home")
}
