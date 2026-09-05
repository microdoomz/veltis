"use client"

import React, { useState } from "react"
import { Amount } from "@/components/ui/amount"
import { ListContainer, ListItem } from "@/components/ui/transitions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateTransactionAction, deleteTransactionAction } from "@/app/actions/transaction"
import {
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Calendar,
  CreditCard,
  Tag,
  Store,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from "lucide-react"

export interface TransactionItem {
  id: string
  description?: string | null
  merchantName?: string | null
  amountMinor: string | number | bigint
  currency: string
  transactionDate: string | Date
  transactionType: string
  source: string
  categoryId?: string | null
  category?: { id: string; name: string } | null
  legs?: Array<{
    accountId?: string | null
    account?: { id: string; name: string; currency: string } | null
  }>
}

interface CategoryOption {
  id: string
  name: string
}

interface AccountOption {
  id: string
  name: string
  currency: string
}

export function TransactionList({
  transactions,
  categories,
  accounts,
  workspaceId,
}: {
  transactions: TransactionItem[]
  categories: CategoryOption[]
  accounts: AccountOption[]
  workspaceId: string
}) {
  const [selectedTxn, setSelectedTxn] = useState<TransactionItem | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit form state
  const [description, setDescription] = useState("")
  const [merchantName, setMerchantName] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [categoryId, setCategoryId] = useState("none")
  const [accountId, setAccountId] = useState("")

  const openDetailModal = (txn: TransactionItem) => {
    setSelectedTxn(txn)
    setIsEditing(false)
    setIsDeleting(false)
    setDeleteConfirmed(false)
    setError(null)

    // Pre-populate edit form fields
    setDescription(txn.description || "")
    setMerchantName(txn.merchantName || "")
    setAmount((Number(txn.amountMinor) / 100).toFixed(2))
    const d = new Date(txn.transactionDate)
    setDate(d.toISOString().slice(0, 10))
    setCategoryId(txn.categoryId || "none")
    setAccountId(txn.legs?.[0]?.accountId || accounts[0]?.id || "")
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTxn) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("transactionId", selectedTxn.id)
      formData.append("description", description)
      formData.append("merchantName", merchantName)
      formData.append("amount", amount)
      formData.append("date", date)
      formData.append("categoryId", categoryId)
      if (accountId) formData.append("accountId", accountId)

      await updateTransactionAction(workspaceId, formData)
      setSelectedTxn(null)
      setIsEditing(false)
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        setSelectedTxn(null)
        return
      }
      setError(err instanceof Error ? err.message : "Failed to update transaction")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSubmit = async () => {
    if (!selectedTxn) return
    setLoading(true)
    setError(null)

    try {
      await deleteTransactionAction(workspaceId, selectedTxn.id)
      setSelectedTxn(null)
      setIsDeleting(false)
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        setSelectedTxn(null)
        return
      }
      setError(err instanceof Error ? err.message : "Failed to delete transaction")
      setLoading(false)
    }
  }

  return (
    <>
      <ListContainer className="divide-y divide-border">
        {transactions.map((txn) => {
          const isExpense =
            txn.transactionType === "expense" ||
            txn.transactionType === "credit_card_purchase"
          const amtMinorNum = Number(txn.amountMinor)
          const displayMinor = isExpense ? -amtMinorNum : amtMinorNum
          const accountName = txn.legs?.[0]?.account?.name

          return (
            <ListItem
              key={txn.id}
              onClick={() => openDetailModal(txn)}
              className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr,1fr,auto] gap-2 md:gap-4 p-4 items-center cursor-pointer hover:bg-muted/60 transition-colors group select-none"
            >
              {/* Mobile Top Row / Desktop Col 1 */}
              <div className="flex justify-between md:block">
                <p className="font-medium text-sm group-hover:text-primary transition-colors">
                  {txn.description ||
                    (txn.transactionType === "expense"
                      ? "Expense"
                      : txn.transactionType === "income"
                      ? "Income"
                      : "Transfer")}
                </p>
                {/* Mobile Amount */}
                <div className="md:hidden text-right flex flex-col items-end">
                  <Amount
                    valueMinor={BigInt(displayMinor)}
                    currency={txn.currency}
                    colorize="default"
                    showSign={true}
                    className="font-medium"
                  />
                  <span className="text-[10px] text-muted-foreground capitalize mt-1 opacity-70">
                    {txn.source}
                  </span>
                </div>
              </div>

              {/* Desktop Category */}
              <div className="hidden md:flex items-center">
                {txn.category && (
                  <span className="bg-muted px-2 py-1 rounded text-[10px] uppercase font-medium">
                    {txn.category.name}
                  </span>
                )}
              </div>

              {/* Desktop Account */}
              <div className="hidden md:block truncate text-xs text-muted-foreground">
                {accountName}
              </div>

              {/* Desktop Date */}
              <div className="hidden md:block text-xs text-muted-foreground">
                {new Date(txn.transactionDate).toLocaleDateString()}
              </div>

              {/* Mobile Inline Meta */}
              <div className="text-xs text-muted-foreground flex items-center gap-2 md:hidden">
                <span>{new Date(txn.transactionDate).toLocaleDateString()}</span>
                {txn.category && (
                  <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-medium">
                    {txn.category.name}
                  </span>
                )}
                {accountName && <span>&bull; {accountName}</span>}
              </div>

              {/* Desktop Amount */}
              <div className="hidden md:flex flex-col items-end justify-center text-right">
                <Amount
                  valueMinor={BigInt(displayMinor)}
                  currency={txn.currency}
                  colorize="default"
                  showSign={true}
                  className="font-medium text-sm"
                />
                <span className="text-[10px] text-muted-foreground capitalize mt-1 opacity-70">
                  {txn.source}
                </span>
              </div>
            </ListItem>
          )
        })}
      </ListContainer>

      {/* TRANSACTION MODAL */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                {selectedTxn.transactionType === "income" ? (
                  <div className="w-8 h-8 rounded-full bg-positive/10 text-positive flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-danger/10 text-danger flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                )}
                <h3 className="font-semibold text-foreground text-base">
                  {isDeleting
                    ? "Delete Transaction"
                    : isEditing
                    ? "Edit Transaction"
                    : "Transaction Details"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* DELETE VIEW */}
            {isDeleting ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-2 text-foreground">
                  <p className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Double-Entry Accounting Reversal
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Deleting this transaction will reverse its ledger balance impact on your account and exclude it from all reporting and budget calculations.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    In compliance with double-entry principles, the record is soft-deleted and preserved for audit trails.
                  </p>
                </div>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deleteConfirmed}
                    onChange={(e) => setDeleteConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-border"
                  />
                  <span className="text-xs text-foreground leading-normal">
                    I understand and want to delete this transaction (
                    {selectedTxn.description || "Transaction"}) of{" "}
                    {selectedTxn.currency}{" "}
                    {(Number(selectedTxn.amountMinor) / 100).toFixed(2)}.
                  </span>
                </label>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleting(false)}
                    disabled={loading}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={!deleteConfirmed || loading}
                    onClick={handleDeleteSubmit}
                    className="rounded-xl"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Confirm &amp; Delete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : isEditing ? (
              /* EDIT FORM VIEW */
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Description *</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Grocery shopping"
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Amount ({selectedTxn.currency}) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Date *</label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Merchant / Payee</label>
                  <Input
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="e.g. Trader Joe's, Uber, Amazon"
                    className="rounded-xl"
                  />
                </div>

                {categories.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Category</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                    >
                      <option value="none">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {accounts.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Account</label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={loading}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={loading} className="rounded-xl">
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              /* DETAILS VIEW */
              <div className="space-y-5">
                {/* Large Amount banner */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium block">
                      Amount
                    </span>
                    <Amount
                      valueMinor={BigInt(
                        selectedTxn.transactionType === "expense" ||
                        selectedTxn.transactionType === "credit_card_purchase"
                          ? -Number(selectedTxn.amountMinor)
                          : Number(selectedTxn.amountMinor)
                      )}
                      currency={selectedTxn.currency}
                      colorize="default"
                      showSign={true}
                      className="text-2xl font-bold"
                    />
                  </div>
                  <span className="capitalize text-xs font-bold px-2.5 py-1 rounded-full bg-muted border border-border">
                    {selectedTxn.transactionType}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Description
                    </span>
                    <p className="font-semibold text-foreground text-sm">
                      {selectedTxn.description || "None"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Date
                    </span>
                    <p className="font-semibold text-foreground text-sm">
                      {new Date(selectedTxn.transactionDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      Category
                    </span>
                    <p className="font-semibold text-foreground text-sm">
                      {selectedTxn.category?.name || "Uncategorized"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      Account
                    </span>
                    <p className="font-semibold text-foreground text-sm">
                      {selectedTxn.legs?.[0]?.account?.name || "Account"}
                    </p>
                  </div>

                  {selectedTxn.merchantName && (
                    <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Store className="w-3.5 h-3.5" />
                        Merchant
                      </span>
                      <p className="font-semibold text-foreground text-sm">
                        {selectedTxn.merchantName}
                      </p>
                    </div>
                  )}

                  <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Source
                    </span>
                    <p className="font-semibold text-foreground text-sm capitalize">
                      {selectedTxn.source || "manual"}
                    </p>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setIsDeleting(true)
                      setDeleteConfirmed(false)
                    }}
                    className="rounded-xl text-xs h-9 px-3"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="rounded-xl text-xs h-9 px-3"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setSelectedTxn(null)}
                      className="rounded-xl text-xs h-9 px-4"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
