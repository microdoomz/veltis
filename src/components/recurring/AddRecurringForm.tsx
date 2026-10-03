'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addRecurringAction } from '@/app/actions/recurring'
import { Plus, ArrowRight, Loader2 } from 'lucide-react'

interface AccountOption {
  id: string
  name: string
  accountType: string
  currency: string
}

interface CategoryOption {
  id: string
  name: string
}

interface AddRecurringFormProps {
  workspaceId: string
  accounts: AccountOption[]
  categories: CategoryOption[]
}

export function AddRecurringForm({ workspaceId, accounts, categories }: AddRecurringFormProps) {
  const [type, setType] = useState<'expense' | 'income' | 'transfer' | 'investment'>('expense')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [customDay, setCustomDay] = useState('1')
  const [categoryId, setCategoryId] = useState('')
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter accounts per specification:
  // - In Source accounts for both Transfer and Investment: do NOT show investment accounts.
  // - For Transfer: in Destination account do NOT show investment accounts.
  // - For Investment: in Destination account show ONLY investment accounts.
  const nonInvestmentAccounts = accounts.filter(a => a.accountType !== 'investment')
  const investmentAccounts = accounts.filter(a => a.accountType === 'investment')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('type', type)
      formData.append('name', name)
      formData.append('amount', amount)
      formData.append('customDay', customDay)
      formData.append('categoryId', categoryId)

      if (type === 'transfer' || type === 'investment') {
        if (!sourceAccountId) {
          throw new Error('Please select a Source Account')
        }
        if (!destinationAccountId) {
          throw new Error('Please select a Destination Account')
        }
        formData.append('defaultAccountId', sourceAccountId)
        formData.append('destinationAccountId', destinationAccountId)
      } else {
        formData.append('defaultAccountId', sourceAccountId)
        formData.append('destinationAccountId', '')
      }

      await addRecurringAction(workspaceId, formData)
      
      // Reset form
      setName('')
      setAmount('')
      setCategoryId('')
      setSourceAccountId('')
      setDestinationAccountId('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create recurring item')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-6 border border-border/80 rounded-2xl shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Plus className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Add Recurring Item</h2>
          <p className="text-xs text-muted-foreground">Automate expenses, incomes, transfers, and recurring SIP investments</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => {
                const newType = e.target.value as 'expense' | 'income' | 'transfer' | 'investment'
                setType(newType)
                setSourceAccountId('')
                setDestinationAccountId('')
              }}
              className="flex h-11 w-full rounded-xl border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
              <option value="investment">Investment (SIP)</option>
            </select>
          </div>

          {/* Name / Merchant */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              {type === 'investment' ? 'Investment / SIP Name' : 'Name / Merchant'}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={
                type === 'investment'
                  ? 'e.g. Parag Parikh Flexi Cap Fund'
                  : type === 'transfer'
                  ? 'e.g. Monthly Savings Transfer'
                  : 'e.g. Netflix, Rent, Salary...'
              }
              className="h-11 rounded-xl"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Amount
            </label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              className="h-11 rounded-xl"
            />
          </div>

          {/* Day of Month */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Day of Month (1 - 31)
            </label>
            <Input
              value={customDay}
              onChange={(e) => setCustomDay(e.target.value)}
              type="number"
              min="1"
              max="31"
              required
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        {/* Dynamic Account & Category Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {type === 'transfer' ? (
            <>
              {/* Source Account (Exclude Investment) */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Source Account (Debit)
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  required
                  className="flex h-11 w-full rounded-xl border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Source Account (Bank / Cash)</option>
                  {nonInvestmentAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Account (Exclude Investment) */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Destination Account (Credit)
                </label>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  required
                  className="flex h-11 w-full rounded-xl border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Destination Account (Bank / Cash)</option>
                  {nonInvestmentAccounts
                    .filter((a) => a.id !== sourceAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.accountType})
                      </option>
                    ))}
                </select>
              </div>
            </>
          ) : type === 'investment' ? (
            <>
              {/* Source Account (Exclude Investment) */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Funding Account (Source Bank)
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  required
                  className="flex h-11 w-full rounded-xl border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Funding Account (Bank / Wallet)</option>
                  {nonInvestmentAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Account (ONLY Investment Accounts) */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Destination Investment Holding / Account
                </label>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  required
                  className="flex h-11 w-full rounded-xl border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Investment Account (Mutual Fund / Stock)</option>
                  {investmentAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Investment)
                    </option>
                  ))}
                </select>
                {investmentAccounts.length === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    No investment accounts found. Please create an investment account in the Accounts or Investments page first.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Account for Expense / Income */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {type === 'expense' ? 'Payment Account' : 'Deposit Account'}
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Account (Optional)</option>
                  {nonInvestmentAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Category (Optional)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 rounded-xl font-semibold shadow-xs mt-2 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating Recurring Item...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Create Recurring Item
            </>
          )}
        </Button>
      </form>
    </Card>
  )
}
