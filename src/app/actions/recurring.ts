"use server"

import { requireStrictWorkspaceAccess } from "@/lib/auth/guards"
import { createRecurringItem, confirmOccurrence, deleteRecurringItem, skipOccurrence } from "@/lib/services/recurring"
import { db } from "@/lib/db"
import { workspace } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const recurringFormSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer', 'investment']),
  name: z.string().min(1),
  amountStr: z.string().min(1),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  defaultAccountId: z.string().uuid().optional().or(z.literal('')),
  destinationAccountId: z.string().uuid().optional().or(z.literal('')),
  customDay: z.string(),
  currency: z.string().optional(),
})

export async function addRecurringAction(workspaceId: string, formData: FormData) {
  const authContext = await requireStrictWorkspaceAccess(workspaceId)
  
  const rawData = {
    type: formData.get("type"),
    name: formData.get("name"),
    amountStr: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    defaultAccountId: formData.get("defaultAccountId"),
    destinationAccountId: formData.get("destinationAccountId"),
    customDay: formData.get("customDay"),
    currency: formData.get("currency"),
  }
  
  const parsed = recurringFormSchema.parse(rawData)
  const amountMinor = BigInt(Math.round(parseFloat(parsed.amountStr) * 100))

  // Fetch workspace currency to ensure we never use hardcoded USD
  const ws = await db.query.workspace.findFirst({
    where: eq(workspace.id, authContext.workspaceId),
  })
  const baseCurrency = parsed.currency || ws?.baseCurrency || 'INR'

  await createRecurringItem({
    workspaceId: authContext.workspaceId,
    type: parsed.type,
    name: parsed.name,
    expectedAmountMinor: amountMinor,
    currency: baseCurrency.toUpperCase(),
    categoryId: parsed.categoryId === '' ? undefined : parsed.categoryId,
    defaultAccountId: parsed.defaultAccountId === '' ? undefined : parsed.defaultAccountId,
    destinationAccountId: parsed.destinationAccountId === '' ? undefined : parsed.destinationAccountId,
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
  const destinationAccountId = formData.get("destinationAccountId") as string | null
  const actualDateStr = formData.get("actualDateStr") as string | null
  const amountStr = formData.get("amount") as string | null
  const actualAmountMinor = (amountStr && !isNaN(parseFloat(amountStr)) && parseFloat(amountStr) > 0)
    ? BigInt(Math.round(parseFloat(amountStr) * 100))
    : undefined
  
  await confirmOccurrence(
    occurrenceId, 
    authContext.workspaceId, 
    accountId, 
    authContext.session.user.id,
    actualDateStr || undefined,
    actualAmountMinor,
    destinationAccountId || undefined
  )

  revalidatePath("/recurring")
  revalidatePath("/transactions")
  revalidatePath("/investments")
  revalidatePath("/home")
}

export async function skipOccurrenceAction(workspaceId: string, occurrenceId: string) {
  const authContext = await requireStrictWorkspaceAccess(workspaceId)

  await skipOccurrence(occurrenceId, authContext.workspaceId)

  revalidatePath("/recurring")
  revalidatePath("/home")
}

export async function deleteRecurringItemAction(workspaceId: string, itemId: string) {
  const authContext = await requireStrictWorkspaceAccess(workspaceId)
  
  await deleteRecurringItem(itemId, authContext.workspaceId)

  revalidatePath("/recurring")
}
