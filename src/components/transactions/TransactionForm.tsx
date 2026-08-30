"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { enqueueTransaction, OfflineTransactionPayload } from "@/lib/sync/db"
import { useSync } from "@/components/sync/SyncProvider"

type Account = { id: string; name: string }
type Category = { id: string; name: string }

export function TransactionForm({
  accounts,
  categories
}: {
  accounts: Account[]
  categories: Category[]
}) {
  const [type, setType] = useState<"expense" | "income" | "transfer">("expense")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { triggerSync } = useSync()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      
      const payload: OfflineTransactionPayload = {
        amountMajor: parseFloat(formData.get("amount") as string),
        transactionDate: formData.get("transactionDate") as string,
        description: (formData.get("description") as string) || undefined,
      }

      if (type === "expense" || type === "income") {
        payload.accountId = formData.get("accountId") as string;
        payload.categoryId = (formData.get("categoryId") as string) || undefined;
      } else if (type === "transfer") {
        payload.sourceAccountId = formData.get("sourceAccountId") as string;
        payload.destAccountId = formData.get("destAccountId") as string;
      }

      await enqueueTransaction(type, payload);
      
      // Trigger background sync immediately
      triggerSync();

      router.push("/transactions")
    } catch (error) {
      console.error(error)
      alert("Failed to save transaction.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setType("expense")}
          className={`flex-1 py-3 text-sm font-medium text-center ${type === "expense" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className={`flex-1 py-3 text-sm font-medium text-center ${type === "income" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Income
        </button>
        <button
          type="button"
          onClick={() => setType("transfer")}
          className={`flex-1 py-3 text-sm font-medium text-center ${type === "transfer" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Transfer
        </button>
      </div>

      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="pl-8 text-lg font-medium h-12"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Date</label>
              <Input
                name="transactionDate"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
            {type !== "transfer" && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Merchant / Description</label>
                <Input name="description" placeholder="Where or what?" required />
              </div>
            )}
            {type === "transfer" && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Note (Optional)</label>
                <Input name="description" placeholder="Transfer description" />
              </div>
            )}
          </div>

          {type !== "transfer" ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Account</label>
                <select 
                  name="accountId" 
                  required 
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">Select Account</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
                <select 
                  name="categoryId" 
                  required 
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">From</label>
                <select 
                  name="sourceAccountId" 
                  required 
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">Source Account</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">To</label>
                <select 
                  name="destAccountId" 
                  required 
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">Destination Account</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              {loading ? "Saving..." : `Save ${type.charAt(0).toUpperCase() + type.slice(1)}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
