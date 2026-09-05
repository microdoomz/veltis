'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Amount } from '@/components/ui/amount';
import { EmptyState } from '@/components/ui/empty-state';
import { ArrowUpRight, Plus, CreditCard, Clock, X, AlertCircle } from 'lucide-react';

interface AccountOption {
  id: string;
  name: string;
  currency: string;
  accountType: string;
}

interface LiabilityItem {
  id: string;
  workspaceId: string;
  counterpartyName: string;
  liabilityType: 'person' | 'bank' | 'credit_card' | 'other';
  amountMinor: string | bigint;
  currency: string;
  createdDate: string;
  dueDate?: string | null;
  status: 'open' | 'partially_paid' | 'paid' | 'cancelled';
  note?: string | null;
}

interface LiabilitiesDashboardProps {
  workspaceId: string;
  accounts: AccountOption[];
}

export function LiabilitiesDashboard({ workspaceId, accounts }: LiabilitiesDashboardProps) {
  const [records, setRecords] = useState<LiabilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<LiabilityItem | null>(null);

  // Form states for Add Liability
  const [counterpartyName, setCounterpartyName] = useState('');
  const [liabilityType, setLiabilityType] = useState<'person' | 'bank' | 'credit_card' | 'other'>('person');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(accounts[0]?.currency || 'USD');
  const [createdDate, setCreatedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [destAccountId, setDestAccountId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for Pay Liability
  const [payAccountId, setPayAccountId] = useState(accounts[0]?.id || '');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/liabilities?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (e) {
      console.error('Failed to fetch liabilities:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [workspaceId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(amount);
    if (!counterpartyName.trim() || isNaN(amountVal) || amountVal <= 0) {
      setFormError('Please enter a valid counterparty name and positive amount');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const amountMinor = BigInt(Math.round(amountVal * 100)).toString();
      const res = await fetch('/api/liabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          counterpartyName: counterpartyName.trim(),
          liabilityType,
          amountMinor,
          currency,
          createdDate,
          dueDate: dueDate || undefined,
          destAccountId: destAccountId || undefined,
          note: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create liability');
      }

      setIsAddOpen(false);
      setCounterpartyName('');
      setAmount('');
      setDueDate('');
      setNote('');
      await fetchRecords();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create liability');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget || !payAccountId) {
      setPayError('Source payment account is required');
      return;
    }

    const payVal = parseFloat(payAmount);
    if (isNaN(payVal) || payVal <= 0) {
      setPayError('Please enter a valid positive payment amount');
      return;
    }

    setPaying(true);
    setPayError(null);

    try {
      const amountMinor = BigInt(Math.round(payVal * 100)).toString();
      const res = await fetch(`/api/liabilities/${payTarget.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          sourceAccountId: payAccountId,
          amountMinor,
          paidAt: payDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record liability payment');
      }

      setPayTarget(null);
      await fetchRecords();
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  const openPayModal = (item: LiabilityItem) => {
    setPayTarget(item);
    const majorVal = Number(BigInt(item.amountMinor)) / 100;
    setPayAmount(majorVal.toFixed(2));
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayError(null);
  };

  const openLiabilities = records.filter(l => l.status === 'open' || l.status === 'partially_paid');
  const totalDebtMinor = openLiabilities.reduce((sum, l) => sum + BigInt(l.amountMinor), 0n);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Liabilities</h1>
          <p className="text-sm text-muted-foreground">Track debts, loans, and pay off creditors.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Liability
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Outstanding Debt</p>
            <Amount valueMinor={totalDebtMinor} currency={records[0]?.currency || 'USD'} className="text-2xl font-bold text-danger" />
          </div>
          <div className="p-3 bg-destructive/10 text-danger rounded-full">
            <ArrowUpRight className="h-6 w-6" />
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Obligations</p>
            <p className="text-2xl font-bold">{openLiabilities.length} <span className="text-sm font-normal text-muted-foreground">active</span></p>
          </div>
          <div className="p-3 bg-muted text-muted-foreground rounded-full">
            <Clock className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Liabilities List */}
      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading liabilities...</Card>
      ) : records.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No liabilities recorded"
          description="Keep track of money you owe to persons, banks, or institutions."
          action={
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add First Liability
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {records.map((l) => {
            const isPaid = l.status === 'paid';
            const isPartial = l.status === 'partially_paid';
            return (
              <Card key={l.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/40 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">{l.counterpartyName}</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground capitalize">
                      {l.liabilityType}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      isPaid ? 'bg-positive/15 text-positive' : isPartial ? 'bg-amber-500/15 text-amber-500' : 'bg-destructive/15 text-destructive'
                    }`}>
                      {l.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Created: {l.createdDate}</span>
                    {l.dueDate && <span>• Due: {l.dueDate}</span>}
                    {l.note && <span>• Note: {l.note}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <Amount valueMinor={BigInt(l.amountMinor)} currency={l.currency} className="font-semibold text-lg" colorize="default" />
                  </div>
                  {!isPaid && (
                    <Button size="sm" variant="outline" onClick={() => openPayModal(l)}>
                      <CreditCard className="w-4 h-4 mr-1.5 text-primary" /> Pay
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Liability Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-lg rounded-xl p-6 shadow-xl border border-border space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Add Liability</h2>
                <p className="text-xs text-muted-foreground">Record an obligation or debt you owe.</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-md text-muted-foreground hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Creditor / Name *</label>
                  <Input
                    placeholder="e.g. Jane, Landlord, Bank Loan"
                    value={counterpartyName}
                    onChange={(e) => setCounterpartyName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Liability Type</label>
                  <select
                    value={liabilityType}
                    onChange={(e) => setLiabilityType(e.target.value as 'person' | 'bank' | 'credit_card' | 'other')}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="person">Individual Person</option>
                    <option value="bank">Bank Loan</option>
                    <option value="credit_card">Credit Card Facility</option>
                    <option value="other">Other Liability</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Amount *</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Created Date</label>
                  <Input
                    type="date"
                    value={createdDate}
                    onChange={(e) => setCreatedDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Due Date (Optional)</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {accounts.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Received Into Account (Optional)</label>
                  <select
                    value={destAccountId}
                    onChange={(e) => setDestAccountId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No linked account (External borrowing)</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Notes</label>
                <Input
                  placeholder="e.g. Loan terms, interest rate, agreement #4"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Liability'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Liability Modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-xl border border-border space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Pay Liability</h2>
                <p className="text-xs text-muted-foreground">Record repayment to {payTarget.counterpartyName}.</p>
              </div>
              <button onClick={() => setPayTarget(null)} className="p-1 rounded-md text-muted-foreground hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            {payError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            <form onSubmit={handlePay} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Paid From Account *</label>
                <select
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">Account used to disburse the repayment.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Payment Amount ({payTarget.currency}) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Payment Date</label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setPayTarget(null)}>Cancel</Button>
                <Button type="submit" disabled={paying}>
                  {paying ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
