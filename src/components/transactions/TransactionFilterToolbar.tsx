'use client'

import React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Filter, ArrowUpDown, X, Calendar, Wallet, Layers } from 'lucide-react'

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

  const currentAccount = searchParams.get('account') || 'all'
  const currentCategory = searchParams.get('category') || 'all'
  const currentType = searchParams.get('type') || 'all'
  const currentSort = searchParams.get('sort') || 'date_desc'
  const currentStartDate = searchParams.get('startDate') || ''
  const currentEndDate = searchParams.get('endDate') || ''

  const hasActiveFilters =
    currentAccount !== 'all' ||
    currentCategory !== 'all' ||
    currentType !== 'all' ||
    currentSort !== 'date_desc' ||
    currentStartDate !== '' ||
    currentEndDate !== ''

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === 'all' || (key === 'sort' && value === 'date_desc')) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const clearAllFilters = () => {
    router.push(pathname)
  }

  return (
    <div className="bg-card border border-border/80 p-4 rounded-2xl shadow-xs space-y-3 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span>Filters & Sorting</span>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear Filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Account Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Wallet className="w-3 h-3 text-primary" /> Account
          </label>
          <select
            value={currentAccount}
            onChange={(e) => updateParam('account', e.target.value)}
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

        {/* Flow Type Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Layers className="w-3 h-3 text-primary" /> Flow Type
          </label>
          <select
            value={currentType}
            onChange={(e) => updateParam('type', e.target.value)}
            className="flex h-9 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Flows (Income, Expense, Transfer)</option>
            <option value="expense">Expense Only</option>
            <option value="income">Income Only</option>
            <option value="transfer">Transfer Only</option>
          </select>
        </div>

        {/* Sort By */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3 text-primary" /> Sort By
          </label>
          <select
            value={currentSort}
            onChange={(e) => updateParam('sort', e.target.value)}
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
              value={currentStartDate}
              onChange={(e) => updateParam('startDate', e.target.value)}
              className="flex h-9 w-full rounded-xl border border-border bg-background px-2 py-1 text-[11px] focus:outline-hidden focus:ring-1 focus:ring-primary"
              placeholder="From"
            />
            <input
              type="date"
              value={currentEndDate}
              onChange={(e) => updateParam('endDate', e.target.value)}
              className="flex h-9 w-full rounded-xl border border-border bg-background px-2 py-1 text-[11px] focus:outline-hidden focus:ring-1 focus:ring-primary"
              placeholder="To"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
