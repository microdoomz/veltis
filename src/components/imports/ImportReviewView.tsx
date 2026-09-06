"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Amount } from "@/components/ui/amount"
import { reviewRowAction } from "@/app/actions/import"
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  CheckSquare,
  Square,
  Filter,
} from "lucide-react"

interface ImportRow {
  id: string
  statementImportId: string
  rowNumber: number
  transactionDate: string
  amountMinor: bigint | number
  currency: string
  description: string
  direction: string
  reviewStatus: string
  duplicateStatus: string
  committedTransactionId?: string | null
}

interface ImportRecord {
  id: string
  workspaceId: string
  originalFilename: string
  status: string
  createdAt: Date
  rows: ImportRow[]
}

interface Category {
  id: string
  name: string
}

export function ImportReviewView({
  workspaceId,
  importRecord,
  categories,
}: {
  workspaceId: string
  importRecord: ImportRecord
  categories: Category[]
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all")
  const [directionFilter, setDirectionFilter] = useState<"all" | "credit" | "debit">("all")
  const [isPending, startTransition] = useTransition()
  const [isBulkProcessing, setIsBulkProcessing] = useState(importRecord.status === "processing")

  const [rows, setRows] = useState<ImportRow[]>(importRecord.rows || [])

  useEffect(() => {
    setRows(importRecord.rows || [])
  }, [importRecord.rows])

  const totalCount = rows.length
  const [liveCounts, setLiveCounts] = useState({
    pending: rows.filter((r) => r.reviewStatus === "pending").length,
    accepted: rows.filter((r) => r.reviewStatus === "accepted").length,
    rejected: rows.filter((r) => r.reviewStatus === "rejected").length,
  })

  useEffect(() => {
    setLiveCounts({
      pending: rows.filter((r) => r.reviewStatus === "pending").length,
      accepted: rows.filter((r) => r.reviewStatus === "accepted").length,
      rejected: rows.filter((r) => r.reviewStatus === "rejected").length,
    })
  }, [rows])

  // Restore commit status across navigation if still active
  useEffect(() => {
    try {
      const activeCommit = localStorage.getItem(`veltis_active_commit_${importRecord.id}`)
      if (activeCommit) {
        const parsed = JSON.parse(activeCommit)
        if (Date.now() - parsed.startTime < 120000) {
          setIsBulkProcessing(true)
        } else {
          localStorage.removeItem(`veltis_active_commit_${importRecord.id}`)
        }
      }
    } catch {}
  }, [importRecord.id])

  // Poll status while background processing
  useEffect(() => {
    if (!isBulkProcessing) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/imports/${importRecord.id}/status?workspaceId=${workspaceId}`)
        if (!res.ok) return
        const data = await res.json()

        setLiveCounts({
          pending: data.pendingRows,
          accepted: data.acceptedRows,
          rejected: data.rejectedRows,
        })

        if (data.status !== "processing" || data.pendingRows === 0) {
          setIsBulkProcessing(false)
          localStorage.removeItem(`veltis_active_commit_${importRecord.id}`)
          router.refresh()
        }
      } catch {
        // Ignore network polling error
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [isBulkProcessing, importRecord.id, workspaceId, router])

  const pendingCount = liveCounts.pending
  const acceptedCount = liveCounts.accepted
  const rejectedCount = liveCounts.rejected

  const controlsDisabled = isPending || isBulkProcessing

  // Filtered rows
  const filteredRows = rows.filter((row) => {
    if (statusFilter !== "all" && row.reviewStatus !== statusFilter) return false
    if (directionFilter !== "all" && row.direction !== directionFilter) return false
    return true
  })

  const visiblePendingRows = filteredRows.filter((r) => r.reviewStatus === "pending")
  const allVisiblePendingSelected =
    visiblePendingRows.length > 0 &&
    visiblePendingRows.every((r) => selectedIds.includes(r.id))

  const toggleSelectAllVisible = () => {
    if (allVisiblePendingSelected) {
      const visibleIds = new Set(visiblePendingRows.map((r) => r.id))
      setSelectedIds(selectedIds.filter((id) => !visibleIds.has(id)))
    } else {
      const visibleIds = visiblePendingRows.map((r) => r.id)
      setSelectedIds(Array.from(new Set([...selectedIds, ...visibleIds])))
    }
  }

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBulkAction = async (action: "accept" | "reject", targetIds?: string[]) => {
    const ids = targetIds || selectedIds
    const idSet = new Set(ids.length > 0 ? ids : rows.filter((r) => r.reviewStatus === "pending").map((r) => r.id))

    // Instant optimistic update on UI
    if (action === "reject") {
      setRows((prev) => prev.filter((r) => !idSet.has(r.id)))
    } else {
      setRows((prev) =>
        prev.map((r) => (idSet.has(r.id) ? { ...r, reviewStatus: "accepted" } : r))
      )
    }

    setIsBulkProcessing(true)
    setSelectedIds([])

    try {
      localStorage.setItem(
        `veltis_active_commit_${importRecord.id}`,
        JSON.stringify({ action, startTime: Date.now() })
      )

      const res = await fetch(`/api/imports/${importRecord.id}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          rowIds: ids.length > 0 ? ids : undefined,
          action,
        }),
      })

      if (res.ok) {
        localStorage.removeItem(`veltis_active_commit_${importRecord.id}`)
        router.refresh()
      }
    } catch (err) {
      console.error("Bulk commit request failed:", err)
    } finally {
      setIsBulkProcessing(false)
      localStorage.removeItem(`veltis_active_commit_${importRecord.id}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Counters Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Total Rows</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-positive/20 bg-positive/5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-positive font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Accepted</span>
          </div>
          <p className="text-2xl font-bold text-positive mt-1">{acceptedCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </div>
          <p className="text-2xl font-bold text-destructive mt-1">{rejectedCount}</p>
        </div>
      </div>

      {/* Controls: Bulk Actions & Filters */}
      <Card className="p-4 border border-border/80 rounded-xl space-y-4 shadow-sm">
        {isBulkProcessing && (
          <div className="p-4 bg-primary/10 border border-primary/25 rounded-xl space-y-2.5 text-xs text-primary animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                <span>
                  Processing batch in background... <strong className="underline font-semibold">You can safely leave this page anytime.</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] bg-card px-2.5 py-1 rounded-md text-foreground border border-border flex-shrink-0">
                <span>{totalCount - pendingCount} / {totalCount} completed</span>
                <span>({Math.round(((totalCount - pendingCount) / (totalCount || 1)) * 100)}%)</span>
              </div>
            </div>
            <div className="w-full bg-primary/20 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300 ease-out rounded-full"
                style={{ width: `${Math.max(5, Math.round(((totalCount - pendingCount) / (totalCount || 1)) * 100))}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </div>

            {/* Status pill filter */}
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30 text-xs">
              {(["all", "pending", "accepted", "rejected"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                    statusFilter === st
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  } ${controlsDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Income / Expense filter */}
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30 text-xs">
              <button
                type="button"
                onClick={() => setDirectionFilter("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  directionFilter === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Flow
              </button>
              <button
                type="button"
                onClick={() => setDirectionFilter("credit")}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-all ${
                  directionFilter === "credit"
                    ? "bg-positive/10 text-positive shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-positive"
                }`}
              >
                <ArrowDownLeft className="w-3 h-3" />
                Income
              </button>
              <button
                type="button"
                onClick={() => setDirectionFilter("debit")}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-all ${
                  directionFilter === "debit"
                    ? "bg-danger/10 text-danger shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-danger"
                }`}
              >
                <ArrowUpRight className="w-3 h-3" />
                Expense
              </button>
            </div>
          </div>

          {/* Bulk Buttons */}
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const allPendingIds = rows
                      .filter((r) => r.reviewStatus === "pending")
                      .map((r) => r.id)
                    handleBulkAction("accept", allPendingIds)
                  }}
                  disabled={controlsDisabled}
                  className="h-8 text-xs font-semibold text-positive border-positive/30 hover:bg-positive/10"
                >
                  {controlsDisabled ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                  Commit All Pending ({pendingCount})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const allPendingIds = rows
                      .filter((r) => r.reviewStatus === "pending")
                      .map((r) => r.id)
                    handleBulkAction("reject", allPendingIds)
                  }}
                  disabled={controlsDisabled}
                  className="h-8 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  {controlsDisabled ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                  Reject All Pending
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Selected rows action bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-sm">
            <span className="font-semibold text-foreground text-xs sm:text-sm">
              {selectedIds.length} row{selectedIds.length > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleBulkAction("accept")}
                disabled={isPending}
                className="h-7 text-xs bg-positive hover:bg-positive/90 text-white font-medium"
              >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                Commit Selected
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleBulkAction("reject")}
                disabled={isPending}
                className="h-7 text-xs font-medium"
              >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                Reject Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds([])}
                disabled={isPending}
                className="h-7 text-xs"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Select All Pending checkbox header */}
      {visiblePendingRows.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={toggleSelectAllVisible}
            className={`flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ${
              controlsDisabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {allVisiblePendingSelected ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4 text-muted-foreground" />
            )}
            <span>Select all visible pending rows ({visiblePendingRows.length})</span>
          </button>
        </div>
      )}

      {/* Rows List */}
      <div className="space-y-3">
        {filteredRows.map((row) => {
          const isPendingRow = row.reviewStatus === "pending"
          const isSelected = selectedIds.includes(row.id)
          const isDebit = row.direction === "debit"

          return (
            <Card
              key={row.id}
              className={`p-4 flex flex-col gap-3 rounded-xl border transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : row.duplicateStatus !== "none"
                  ? "border-destructive/60 bg-destructive/5"
                  : !isPendingRow
                  ? "opacity-60 bg-muted/20 border-border/60"
                  : "border-border/80 hover:border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {isPendingRow ? (
                    <button
                      type="button"
                      disabled={controlsDisabled}
                      onClick={() => toggleSelectRow(row.id)}
                      className={`mt-0.5 text-muted-foreground hover:text-primary transition-colors flex-shrink-0 ${
                        controlsDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  ) : (
                    <div className="w-4 flex-shrink-0" />
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {row.transactionDate}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isDebit
                            ? "bg-danger/10 text-danger border border-danger/20"
                            : "bg-positive/10 text-positive border border-positive/20"
                        }`}
                      >
                        {isDebit ? (
                          <>
                            <ArrowUpRight className="w-3 h-3" />
                            Expense
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="w-3 h-3" />
                            Income
                          </>
                        )}
                      </span>
                      {row.duplicateStatus !== "none" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/15 px-2 py-0.5 rounded-md border border-destructive/30">
                          Possible Duplicate
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground leading-snug">{row.description}</p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <Amount
                    valueMinor={BigInt(isDebit ? -Number(row.amountMinor) : Number(row.amountMinor))}
                    currency={row.currency}
                    colorize="default"
                    showSign={true}
                    className="font-bold text-base"
                  />
                </div>
              </div>

              {/* Action row */}
              {isPendingRow ? (
                <form
                  action={reviewRowAction.bind(null, workspaceId)}
                  className="flex flex-wrap sm:flex-nowrap gap-2 bg-muted/40 p-2.5 rounded-lg items-center border border-border/50 mt-1"
                >
                  <input type="hidden" name="rowId" value={row.id} />
                  <input type="hidden" name="importId" value={importRecord.id} />

                  <div className="flex-1 min-w-[180px]">
                    <select
                      name="categoryId"
                      className="w-full h-8 rounded-md text-xs border border-border bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select Category (Optional)</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      name="action"
                      value="commit"
                      size="sm"
                      disabled={controlsDisabled}
                      className="h-8 px-3 text-xs bg-positive hover:bg-positive/90 text-white font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Commit
                    </Button>
                    <Button
                      type="submit"
                      name="action"
                      value="reject"
                      variant="outline"
                      size="sm"
                      disabled={controlsDisabled}
                      className="h-8 px-3 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 font-medium"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pt-1 border-t border-border/40">
                  {row.reviewStatus === "accepted" ? (
                    <span className="inline-flex items-center gap-1 text-positive font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Committed to Ledger
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-destructive font-semibold">
                      <XCircle className="w-3.5 h-3.5" />
                      Rejected
                    </span>
                  )}
                </div>
              )}
            </Card>
          )
        })}

        {filteredRows.length === 0 && (
          <Card className="p-8 text-center border-dashed border-border rounded-xl">
            <p className="text-sm text-muted-foreground">No statement rows match the current filters.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
