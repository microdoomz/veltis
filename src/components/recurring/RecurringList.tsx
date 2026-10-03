'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Amount } from '@/components/ui/amount'
import {
  confirmOccurrenceAction,
  skipOccurrenceAction,
  deleteRecurringItemAction,
} from '@/app/actions/recurring'
import {
  Repeat,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Loader2,
  ArrowRight,
  SkipForward,
  Edit3,
  X,
} from 'lucide-react'
import { formatISTDateOnly, getDaysDifferenceFromToday } from '@/lib/date'
import { useCurrency } from '@/components/layout/CurrencyProvider'
import { getCurrencySymbol } from '@/lib/money'

export interface AccountOption {
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
  baseCurrency?: string
}

export function RecurringList({
  workspaceId,
  items: initialItems,
  accounts,
  baseCurrency: propBaseCurrency,
}: RecurringListProps) {
  const router = useRouter()
  const { baseCurrency: contextBaseCurrency } = useCurrency()
  const activeCurrency = propBaseCurrency || contextBaseCurrency || 'INR'

  const [items, setItems] = useState<RecurringItemData[]>(initialItems)
  const [error, setError] = useState<string | null>(null)

  // Custom Delete Modal State
  const [itemToDelete, setItemToDelete] = useState<RecurringItemData | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Review Occurrence Modal State (Confirm, Edit, Skip)
  const [reviewState, setReviewState] = useState<{
    item: RecurringItemData
    occ: RecurringOccurrenceItem
  } | null>(null)
  const [modalOption, setModalOption] = useState<'confirm' | 'edit' | 'skip'>('confirm')

  // Edit fields inside Review Modal
  const [editAmount, setEditAmount] = useState<string>('')
  const [editDate, setEditDate] = useState<string>('')
  const [editSourceAccountId, setEditSourceAccountId] = useState<string>('')
  const [editDestinationAccountId, setEditDestinationAccountId] = useState<string>('')
  const [isProcessingModal, setIsProcessingModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Sync when initialItems prop changes
  React.useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const nonInvestmentAccounts = accounts.filter((a) => a.accountType !== 'investment')
  const investmentAccounts = accounts.filter((a) => a.accountType === 'investment')

  // Open the review modal with prefilled data
  const handleOpenReviewModal = (item: RecurringItemData, occ: RecurringOccurrenceItem) => {
    const formattedAmount = (Number(item.expectedAmountMinor) / 100).toFixed(2)
    setReviewState({ item, occ })
    setModalOption('confirm')
    setEditAmount(formattedAmount)
    setEditDate(occ.expectedDate || new Date().toISOString().split('T')[0])
    setEditSourceAccountId(item.defaultAccountId || nonInvestmentAccounts[0]?.id || '')
    setEditDestinationAccountId(
      item.destinationAccountId ||
        (item.type === 'investment' ? investmentAccounts[0]?.id : nonInvestmentAccounts[1]?.id) ||
        ''
    )
    setModalError(null)
  }

  // Action: Custom Delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    setError(null)

    const itemId = itemToDelete.id
    // Optimistically remove from list
    setItems((prev) => prev.filter((i) => i.id !== itemId))

    try {
      await deleteRecurringItemAction(workspaceId, itemId)
      setItemToDelete(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete recurring item')
      setItems(initialItems)
    } finally {
      setIsDeleting(false)
    }
  }

  // Action: Quick Confirm
  const handleModalConfirm = async () => {
    if (!reviewState) return
    setIsProcessingModal(true)
    setModalError(null)

    try {
      const formData = new FormData()
      formData.append('occurrenceId', reviewState.occ.id)
      formData.append(
        'accountId',
        reviewState.item.defaultAccountId || nonInvestmentAccounts[0]?.id || ''
      )
      if (reviewState.item.destinationAccountId) {
        formData.append('destinationAccountId', reviewState.item.destinationAccountId)
      }
      formData.append('actualDateStr', reviewState.occ.expectedDate)
      const standardAmount = (Number(reviewState.item.expectedAmountMinor) / 100).toFixed(2)
      formData.append('amount', standardAmount)

      await confirmOccurrenceAction(workspaceId, formData)
      setReviewState(null)
      router.refresh()
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to confirm occurrence')
    } finally {
      setIsProcessingModal(false)
    }
  }

  // Action: Edit & Confirm
  const handleModalEditConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewState) return

    const numAmt = parseFloat(editAmount)
    if (isNaN(numAmt) || numAmt <= 0) {
      setModalError('Please enter a valid amount')
      return
    }
    if (!editSourceAccountId) {
      setModalError('Please select a source account')
      return
    }
    if (
      (reviewState.item.type === 'transfer' || reviewState.item.type === 'investment') &&
      !editDestinationAccountId
    ) {
      setModalError('Please select a destination account')
      return
    }

    setIsProcessingModal(true)
    setModalError(null)

    try {
      const formData = new FormData()
      formData.append('occurrenceId', reviewState.occ.id)
      formData.append('accountId', editSourceAccountId)
      if (editDestinationAccountId) {
        formData.append('destinationAccountId', editDestinationAccountId)
      }
      formData.append('actualDateStr', editDate)
      formData.append('amount', editAmount)

      await confirmOccurrenceAction(workspaceId, formData)
      setReviewState(null)
      router.refresh()
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to confirm occurrence with edits')
    } finally {
      setIsProcessingModal(false)
    }
  }

  // Action: Skip Occurrence for this month
  const handleModalSkip = async () => {
    if (!reviewState) return
    setIsProcessingModal(true)
    setModalError(null)

    try {
      await skipOccurrenceAction(workspaceId, reviewState.occ.id)
      setReviewState(null)
      router.refresh()
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to skip occurrence')
    } finally {
      setIsProcessingModal(false)
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
    <>
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
          const itemCurrency = item.currency || activeCurrency

          const sourceAcc = accounts.find((a) => a.id === item.defaultAccountId)
          const destAcc = accounts.find((a) => a.id === item.destinationAccountId)

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

                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
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
                      currency={itemCurrency}
                      colorize="default"
                      showSign={isExpense || isIncome}
                      className="text-base font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setItemToDelete(item)}
                      className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Delete Recurring Item"
                    >
                      <Trash2 className="w-4 h-4" />
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
                          <div className="flex items-center justify-between gap-2 mb-2.5">
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

                          {/* Account Leg Summary for Occurrences */}
                          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                            {isTransfer || isInvestment ? (
                              <span>
                                Account:{' '}
                                <strong className="text-foreground font-medium">
                                  {sourceAcc?.name || 'Bank'}
                                </strong>{' '}
                                →{' '}
                                <strong className="text-foreground font-medium">
                                  {destAcc?.name || 'Investment'}
                                </strong>
                              </span>
                            ) : (
                              <span>
                                Account:{' '}
                                <strong className="text-foreground font-medium">
                                  {sourceAcc?.name || 'Default Account'}
                                </strong>
                              </span>
                            )}
                          </div>

                          {/* Confirm Action Trigger */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                            {!isDueForReview ? (
                              <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                                Confirm will be available on {formattedDate}.
                              </p>
                            ) : (
                              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                Ready for review. Confirm or customize.
                              </p>
                            )}

                            <Button
                              type="button"
                              size="sm"
                              disabled={!isDueForReview}
                              onClick={() => handleOpenReviewModal(item, occ)}
                              title={
                                !isDueForReview
                                  ? `Confirm will be available on ${formattedDate}`
                                  : 'Click to review, confirm, edit or skip'
                              }
                              className={`h-8 px-3 text-xs font-semibold rounded-lg shrink-0 gap-1.5 transition-all ${
                                isDueForReview
                                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer'
                                  : 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Confirm
                            </Button>
                          </div>
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

      {/* 1. Custom Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Recurring Schedule</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-foreground/80 leading-relaxed">
              Are you sure you want to delete the recurring schedule for{' '}
              <span className="font-semibold text-foreground">"{itemToDelete.name}"</span>?
              All pending monthly reviews and reminders will also be deleted.
            </p>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!isDeleting) setItemToDelete(null)
                }}
                disabled={isDeleting}
                className="rounded-xl h-10 px-4 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="rounded-xl h-10 px-4 text-xs font-semibold gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Schedule
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Review Occurrence Modal (Confirm, Edit, Skip) */}
      {reviewState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Review Recurring Occurrence</h3>
                  <p className="text-xs text-muted-foreground">
                    {reviewState.item.name} &bull; Scheduled for{' '}
                    {formatISTDateOnly(reviewState.occ.expectedDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isProcessingModal) setReviewState(null)
                }}
                disabled={isProcessingModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* 3 Options Navigation Tabs: Confirm, Edit, Skip */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/50 border border-border/70 rounded-xl">
              <button
                type="button"
                onClick={() => setModalOption('confirm')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  modalOption === 'confirm'
                    ? 'bg-card text-foreground shadow-xs border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>1. Confirm</span>
              </button>

              <button
                type="button"
                onClick={() => setModalOption('edit')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  modalOption === 'edit'
                    ? 'bg-card text-foreground shadow-xs border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>2. Edit</span>
              </button>

              <button
                type="button"
                onClick={() => setModalOption('skip')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  modalOption === 'skip'
                    ? 'bg-card text-foreground shadow-xs border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <SkipForward className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>3. Skip</span>
              </button>
            </div>

            {/* Option 1: Confirm Content */}
            {modalOption === 'confirm' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Amount:</span>
                    <Amount
                      valueMinor={BigInt(reviewState.item.expectedAmountMinor)}
                      currency={reviewState.item.currency || activeCurrency}
                      className="text-lg font-bold"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-semibold text-foreground">
                      {formatISTDateOnly(reviewState.occ.expectedDate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Source Account:</span>
                    <span className="font-semibold text-foreground">
                      {accounts.find(
                        (a) =>
                          a.id === (reviewState.item.defaultAccountId || editSourceAccountId)
                      )?.name || 'Default Account'}
                    </span>
                  </div>
                  {(reviewState.item.type === 'transfer' ||
                    reviewState.item.type === 'investment') && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Destination Account:</span>
                      <span className="font-semibold text-foreground">
                        {accounts.find(
                          (a) =>
                            a.id ===
                            (reviewState.item.destinationAccountId || editDestinationAccountId)
                        )?.name || 'Destination Account'}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Directly apply this transaction with the standard scheduled details. The transaction
                  will be recorded and the schedule will advance to next month.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReviewState(null)}
                    disabled={isProcessingModal}
                    className="rounded-xl h-10 px-4 text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleModalConfirm}
                    disabled={isProcessingModal}
                    className="rounded-xl h-10 px-5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-xs"
                  >
                    {isProcessingModal ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm &amp; Apply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Option 2: Edit Content */}
            {modalOption === 'edit' && (
              <form onSubmit={handleModalEditConfirm} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Amount ({getCurrencySymbol(reviewState.item.currency || activeCurrency)})
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="h-10 text-sm font-semibold rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Transaction Date
                    </label>
                    <Input
                      type="date"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="h-10 text-sm rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    {reviewState.item.type === 'expense'
                      ? 'Payment Account'
                      : reviewState.item.type === 'income'
                      ? 'Deposit Account'
                      : 'Source Account (Debit)'}
                  </label>
                  <select
                    value={editSourceAccountId}
                    onChange={(e) => setEditSourceAccountId(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Account</option>
                    {nonInvestmentAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.accountType})
                      </option>
                    ))}
                  </select>
                </div>

                {(reviewState.item.type === 'transfer' ||
                  reviewState.item.type === 'investment') && (
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      {reviewState.item.type === 'investment'
                        ? 'Destination Investment Fund'
                        : 'Destination Account (Credit)'}
                    </label>
                    <select
                      value={editDestinationAccountId}
                      onChange={(e) => setEditDestinationAccountId(e.target.value)}
                      required
                      className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select Destination</option>
                      {reviewState.item.type === 'investment'
                        ? investmentAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} (Investment)
                            </option>
                          ))
                        : nonInvestmentAccounts
                            .filter((a) => a.id !== editSourceAccountId)
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.accountType})
                              </option>
                            ))}
                    </select>
                  </div>
                )}

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Modify the amount or change the accounts for this month's occurrence. The transaction
                  will apply your custom values and advance to next month.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReviewState(null)}
                    disabled={isProcessingModal}
                    className="rounded-xl h-10 px-4 text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isProcessingModal}
                    className="rounded-xl h-10 px-5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-xs"
                  >
                    {isProcessingModal ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving &amp; Applying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm with Edits
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Option 3: Skip Content */}
            {modalOption === 'skip' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                  <p className="font-semibold text-sm flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Skip this month's occurrence?
                  </p>
                  <p className="leading-relaxed">
                    Skipping will not deduct, transfer, or invest any money for "{reviewState.item.name}".
                    This month's review will be marked as skipped, and the schedule will advance to
                    next month automatically.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReviewState(null)}
                    disabled={isProcessingModal}
                    className="rounded-xl h-10 px-4 text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleModalSkip}
                    disabled={isProcessingModal}
                    className="rounded-xl h-10 px-5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-xs"
                  >
                    {isProcessingModal ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Skipping...
                      </>
                    ) : (
                      <>
                        <SkipForward className="w-3.5 h-3.5" />
                        Skip This Month
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
