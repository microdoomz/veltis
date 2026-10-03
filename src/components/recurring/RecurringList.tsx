'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Amount } from '@/components/ui/amount'
import { confirmOccurrenceAction, deleteRecurringItemAction } from '@/app/actions/recurring'
import {
  Repeat,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Loader2,
  ArrowRight,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'
import { formatISTDateOnly, getDaysDifferenceFromToday } from '@/lib/date'

interface AccountOption {
  id: string
  name: string
  accountType: string
  currency: string
}

export interface RecurringOccurrenceItem {
  id: string
  expectedDate: string
  status: string
  actualDate?: string | null
  actualAmountMinor?: bigint | string | null
}

export interface RecurringItemData {
  id: string
  type: string
  name: string
  expectedAmountMinor: bigint | string | number
  currency: string
  categoryId?: string | null
  defaultAccountId?: string | null
  destinationAccountId?: string | null
  customDay?: number | null
  frequency: string
  dayRule: string
  pendingOccurrences: RecurringOccurrenceItem[]
}

interface RecurringListProps {
  workspaceId: string
  items: RecurringItemData[]
  accounts: AccountOption[]
}

export function RecurringList({ workspaceId, items: initialItems, accounts }: RecurringListProps) {
  const [items, setItems] = useState<RecurringItemData[]>(initialItems)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [confirmingOccId, setConfirmingOccId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Sync when initialItems prop changes
  React.useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const nonInvestmentAccounts = accounts.filter(a => a.accountType !== 'investment')
  const investmentAccounts = accounts.filter(a => a.accountType === 'investment')

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    const isConfirmed = window.confirm(
      `Delete recurring schedule for "${itemName}"?\n\nThis will remove the recurring item and cancel all pending reviews.`
    )
    if (!isConfirmed) return

    setDeletingItemId(itemId)
    setError(null)

    // Optimistically remove from list
    setItems(prev => prev.filter(i => i.id !== itemId))

    try {
      await deleteRecurringItemAction(workspaceId, itemId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete recurring item')
      setItems(initialItems)
    } finally {
      setDeletingItemId(null)
    }
  }

  const handleConfirmOccurrence = async (e: React.FormEvent<HTMLFormElement>, occId: string) => {
    e.preventDefault()
    setConfirmingOccId(occId)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
      await confirmOccurrenceAction(workspaceId, formData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to confirm occurrence')
    } finally {
      setConfirmingOccId(null)
    }
  }

  if (items.length === 0) {
    return (
      <Card className="col-span-full p-10 text-center border-dashed border-border rounded-2xl bg-card/40">
        <Repeat className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-base font-semibold text-foreground">No recurring items or SIPs set up yet</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Create your first subscription, monthly bill, transfer rule, or SIP investment using the form below.
        </p>
      </Card>
    )
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {error && (
        <div className="col-span-full p-3.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {items.map((item) => {
        const expectedMinor = BigInt(item.expectedAmountMinor)
        const isExpense = item.type === 'expense'
        const isIncome = item.type === 'income'
        const isTransfer = item.type === 'transfer'
        const isInvestment = item.type === 'investment'

        const sourceAcc = accounts.find(a => a.id === item.defaultAccountId)
        const destAcc = accounts.find(a => a.id === item.destinationAccountId)
        const isDeletingThis = deletingItemId === item.id

        return (
          <Card
            key={item.id}
            className="p-5 border border-border/80 shadow-xs rounded-2xl flex flex-col justify-between hover:border-border transition-all bg-card"
          >
            <div>
              {/* Header: Name, Type Badge, Amount, and Delete Button */}
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base text-foreground truncate">{item.name}</h3>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                        isInvestment
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                          : isTransfer
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : isIncome
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isInvestment ? 'SIP / Investment' : item.type}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Monthly &bull; Day {item.customDay || 1}</span>
                    {(isTransfer || isInvestment) && sourceAcc && destAcc && (
                      <span className="truncate">
                        &bull; {sourceAcc.name} → {destAcc.name}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Amount
                    valueMinor={isExpense ? -expectedMinor : expectedMinor}
                    currency={item.currency}
                    colorize="default"
                    showSign={isExpense || isIncome}
                    className="text-base font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id, item.name)}
                    disabled={isDeletingThis}
                    className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title="Delete Recurring Item"
                  >
                    {isDeletingThis ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Pending Reviews & Confirmation Section */}
              {item.pendingOccurrences.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Upcoming Review ({item.pendingOccurrences.length})
                    </p>
                  </div>

                  {item.pendingOccurrences.map((occ) => {
                    const diffDays = getDaysDifferenceFromToday(occ.expectedDate)
                    const isDueForReview = diffDays <= 0
                    const formattedDate = formatISTDateOnly(occ.expectedDate)
                    const isConfirming = confirmingOccId === occ.id

                    return (
                      <div
                        key={occ.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isDueForReview
                            ? 'bg-amber-500/5 border-amber-500/30 dark:bg-amber-950/10'
                            : 'bg-muted/30 border-border/60'
                        }`}
                      >
                        {/* Status Bar */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-semibold text-xs sm:text-sm text-foreground">
                              {formattedDate}
                            </span>
                          </div>

                          {isDueForReview ? (
                            <span className="text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border border-amber-500/20">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              Due for Review
                            </span>
                          ) : (
                            <span className="text-[11px] bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border border-sky-500/20">
                              <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                              Due in {diffDays} {diffDays === 1 ? 'day' : 'days'}
                            </span>
                          )}
                        </div>

                        {/* Confirmation Form */}
                        <form
                          onSubmit={(e) => handleConfirmOccurrence(e, occ.id)}
                          className="space-y-2.5"
                        >
                          <input type="hidden" name="occurrenceId" value={occ.id} />

                          {/* Account Selectors */}
                          {isTransfer ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                                  Source Account (Bank)
                                </label>
                                <select
                                  name="accountId"
                                  required
                                  defaultValue={item.defaultAccountId || ''}
                                  className="h-8 w-full rounded-lg text-xs border border-border bg-background text-foreground px-2 py-1 focus:ring-1 focus:ring-primary truncate"
                                >
                                  <option value="">Select Source Account</option>
                                  {nonInvestmentAccounts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                                  Destination Account (Bank)
                                </label>
                                <select
                                  name="destinationAccountId"
                                  required
                                  defaultValue={item.destinationAccountId || ''}
                                  className="h-8 w-full rounded-lg text-xs border border-border bg-background text-foreground px-2 py-1 focus:ring-1 focus:ring-primary truncate"
                                >
                                  <option value="">Select Destination Account</option>
                                  {nonInvestmentAccounts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ) : isInvestment ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                                  Funding Bank Account
                                </label>
                                <select
                                  name="accountId"
                                  required
                                  defaultValue={item.defaultAccountId || ''}
                                  className="h-8 w-full rounded-lg text-xs border border-border bg-background text-foreground px-2 py-1 focus:ring-1 focus:ring-primary truncate"
                                >
                                  <option value="">Select Bank Account</option>
                                  {nonInvestmentAccounts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                                  Destination Investment Fund
                                </label>
                                <select
                                  name="destinationAccountId"
                                  required
                                  defaultValue={item.destinationAccountId || ''}
                                  className="h-8 w-full rounded-lg text-xs border border-border bg-background text-foreground px-2 py-1 focus:ring-1 focus:ring-primary truncate"
                                >
                                  <option value="">Select Investment Account</option>
                                  {investmentAccounts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <label className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                                {isExpense ? 'Payment Account' : 'Deposit Account'}
                              </label>
                              <select
                                name="accountId"
                                required
                                defaultValue={item.defaultAccountId || ''}
                                className="h-8 w-full rounded-lg text-xs border border-border bg-background text-foreground px-2 py-1 focus:ring-1 focus:ring-primary truncate"
                              >
                                <option value="">Select Account</option>
                                {nonInvestmentAccounts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}

                          {/* Confirm Action Button & Note */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                            {!isDueForReview ? (
                              <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                                Confirm will be available on {formattedDate}.
                              </p>
                            ) : (
                              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                Ready for review. Confirm to execute transaction.
                              </p>
                            )}

                            <Button
                              type="submit"
                              size="sm"
                              disabled={!isDueForReview || isConfirming}
                              title={
                                !isDueForReview
                                  ? `Confirm will be available on ${formattedDate}`
                                  : 'Confirm and record transaction'
                              }
                              className={`h-8 px-3 text-xs font-semibold rounded-lg shrink-0 gap-1 transition-all ${
                                isDueForReview
                                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs'
                                  : 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground'
                              }`}
                            >
                              {isConfirming ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Confirming...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Confirm
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
