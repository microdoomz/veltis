'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Filter,
  ArrowUpDown,
  X,
  Calendar,
  Wallet,
  Layers,
  ChevronDown,
  ChevronUp,
  Globe,
  Tag,
  Loader2,
  Check
} from 'lucide-react'

interface AccountOption {
  id: string
  name: string
  currency: string
}

interface CategoryOption {
  id: string
  name: string
}

export function TransactionFilterToolbar({
  accounts,
  categories,
}: {
  accounts: AccountOption[]
  categories: CategoryOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Mobile collapse state
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Local draft states initialized from URL params
  const [draftAccount, setDraftAccount] = useState('all')
  const [draftCategory, setDraftCategory] = useState('all')
  const [draftType, setDraftType] = useState('all')
  const [draftSource, setDraftSource] = useState('all')
  const [draftSort, setDraftSort] = useState('date_desc')
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')

  // Sync draft states when URL search params change
  useEffect(() => {
    setDraftAccount(searchParams.get('account') || 'all')
    setDraftCategory(searchParams.get('category') || 'all')
    setDraftType(searchParams.get('type') || 'all')
    setDraftSource(searchParams.get('source') || 'all')
    setDraftSort(searchParams.get('sort') || 'date_desc')
    setDraftStartDate(searchParams.get('startDate') || '')
    setDraftEndDate(searchParams.get('endDate') || '')
  }, [searchParams])

  // Count active filters in the current URL
  const activeParamCount = [
    searchParams.get('account') && searchParams.get('account') !== 'all',
    searchParams.get('category') && searchParams.get('category') !== 'all',
    searchParams.get('type') && searchParams.get('type') !== 'all',
    searchParams.get('source') && searchParams.get('source') !== 'all',
    searchParams.get('sort') && searchParams.get('sort') !== 'date_desc',
    searchParams.get('startDate'),
    searchParams.get('endDate'),
  ].filter(Boolean).length

  // Check if draft has unsaved changes compared to searchParams
  const hasPendingChanges =
    draftAccount !== (searchParams.get('account') || 'all') ||
    draftCategory !== (searchParams.get('category') || 'all') ||
    draftType !== (searchParams.get('type') || 'all') ||
    draftSource !== (searchParams.get('source') || 'all') ||
    draftSort !== (searchParams.get('sort') || 'date_desc') ||
    draftStartDate !== (searchParams.get('startDate') || '') ||
    draftEndDate !== (searchParams.get('endDate') || '')

  const handleApplyFilters = () => {
    const params = new URLSearchParams()

    if (draftAccount && draftAccount !== 'all') params.set('account', draftAccount)
    if (draftCategory && draftCategory !== 'all') params.set('category', draftCategory)
    if (draftType && draftType !== 'all') params.set('type', draftType)
    if (draftSource && draftSource !== 'all') params.set('source', draftSource)
    if (draftSort && draftSort !== 'date_desc') params.set('sort', draftSort)
    if (draftStartDate) params.set('startDate', draftStartDate)
    if (draftEndDate) params.set('endDate', draftEndDate)

    startTransition(() => {
      const queryString = params.toString()
      router.push(queryString ? `${pathname}?${queryString}` : pathname)
    })
  }

  const handleClearAll = () => {
    setDraftAccount('all')
    setDraftCategory('all')
    setDraftType('all')
    setDraftSource('all')
    setDraftSort('date_desc')
    setDraftStartDate('')
    setDraftEndDate('')

    startTransition(() => {
      router.push(pathname)
    })
  }

  return (
    <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden animate-in fade-in">
      {/* Header bar: Always visible on both desktop & mobile */}
      <div className="p-3 sm:p-4 flex items-center justify-between gap-3 border-b border-border/50 bg-card/60">
        <button
          type="button"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          className="flex items-center gap-2 text-xs font-semibold text-foreground hover:text-primary transition-colors focus:outline-hidden md:cursor-default"
        >
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium">Filters & Sorting</span>
          {activeParamCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
              {activeParamCount}
            </span>
          )}
          <span className="md:hidden text-muted-foreground ml-1">
            {isMobileOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        <div className="flex items-center gap-2">
          {activeParamCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={isPending}
              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Reset
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleApplyFilters}
            disabled={isPending || (!hasPendingChanges && activeParamCount === 0)}
            className={`h-7 text-xs px-3 rounded-lg shadow-xs flex items-center gap-1.5 transition-all ${
              hasPendingChanges ? 'bg-primary text-primary-foreground font-semibold ring-2 ring-primary/20' : ''
            }`}
          >
            {isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3" />
                <span>Apply Filters</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filter Body: Collapsible on mobile (< md), always expanded on desktop (>= md) */}
      <div className={`p-4 space-y-3 ${isMobileOpen ? 'block' : 'hidden md:block'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Account Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Wallet className="w-3 h-3 text-primary" /> Account
            </label>
            <select
              value={draftAccount}
              onChange={(e) => setDraftAccount(e.target.value)}
              className="flex h-9 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Tag className="w-3 h-3 text-primary" /> Category
            </label>
            <select
              value={draftCategory}
              onChange={(e) => setDraftCategory(e.target.value)}
              className="flex h-9 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Flow Type Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Layers className="w-3 h-3 text-primary" /> Flow Type
            </label>
            <select
              value={draftType}
              onChange={(e) => setDraftType(e.target.value)}
              className="flex h-9 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Flows (Income, Expense, Transfer)</option>
              <option value="expense">Expense Only</option>
              <option value="income">Income Only</option>
              <option value="transfer">Transfer Only</option>
            </select>
          </div>

          {/* Source Filter (Item 8 requirement) */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Globe className="w-3 h-3 text-primary" /> Source
            </label>
            <select
              value={draftSource}
              onChange={(e) => setDraftSource(e.target.value)}
              className="flex h-9 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Sources</option>
              <option value="web">Site / Web</option>
              <option value="shortcut">Shortcuts / Siri</option>
              <option value="import">Bank Statement Imports</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-primary" /> Sort By
            </label>
            <select
              value={draftSort}
              onChange={(e) => setDraftSort(e.target.value)}
              className="flex h-9 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3 text-primary" /> Date Range
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={draftStartDate}
                onChange={(e) => setDraftStartDate(e.target.value)}
                className="flex h-9 w-full rounded-xl border border-border bg-background px-2 py-1 text-[11px] focus:outline-hidden focus:ring-1 focus:ring-primary"
                placeholder="From"
              />
              <input
                type="date"
                value={draftEndDate}
                onChange={(e) => setDraftEndDate(e.target.value)}
                className="flex h-9 w-full rounded-xl border border-border bg-background px-2 py-1 text-[11px] focus:outline-hidden focus:ring-1 focus:ring-primary"
                placeholder="To"
              />
            </div>
          </div>
        </div>

        {/* Mobile action button inside drawer for easy thumbs reach */}
        <div className="pt-2 md:hidden flex items-center justify-end gap-2 border-t border-border/40">
          <Button
            size="sm"
            onClick={handleApplyFilters}
            disabled={isPending}
            className="w-full h-9 rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Applying Filters...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Apply Filters
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
