'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Amount } from '@/components/ui/amount';
import { EmptyState } from '@/components/ui/empty-state';
import { ArrowDownLeft, Plus, CheckCircle2, Clock, X, AlertCircle } from 'lucide-react';

interface AccountOption {
  id: string;
  name: string;
  currency: string;
  accountType: string;
}

interface ReceivableItem {
  id: string;
  workspaceId: string;
  counterpartyName: string;
  amountMinor: string | bigint;
  currency: string;
  createdDate: string;
  expectedDate?: string | null;
  status: 'open' | 'partially_received' | 'received' | 'cancelled';
  note?: string | null;
}

interface ReceivablesDashboardProps {
  workspaceId: string;
  accounts: AccountOption[];
}

export function ReceivablesDashboard({ workspaceId, accounts }: ReceivablesDashboardProps) {
  const [records, setRecords] = useState<ReceivableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState<ReceivableItem | null>(null);

  // Form states for Add Receivable
  const [counterpartyName, setCounterpartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(accounts[0]?.currency || 'USD');
  const [createdDate, setCreatedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || '');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for Settle
  const [settleAccountId, setSettleAccountId] = useState(accounts[0]?.id || '');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/receivables?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (e) {
      console.error('Failed to fetch receivables:', e);
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
      const res = await fetch('/api/receivables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          counterpartyName: counterpartyName.trim(),
          amountMinor,
          currency,
          createdDate,
          expectedDate: expectedDate || undefined,
          sourceAccountId: sourceAccountId || undefined,
          note: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create receivable');
      }

      setIsAddOpen(false);
      setCounterpartyName('');
      setAmount('');
      setNote('');
      setExpectedDate('');
      await fetchRecords();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create receivable');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleTarget || !settleAccountId) {
      setSettleError('Destination account is required');
      return;
    }

    const settleVal = parseFloat(settleAmount);
    if (isNaN(settleVal) || settleVal <= 0) {
      setSettleError('Please enter a valid positive settlement amount');
      return;
    }

    setSettling(true);
    setSettleError(null);

    try {
      const amountMinor = BigInt(Math.round(settleVal * 100)).toString();
      const res = await fetch(`/api/receivables/${settleTarget.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          destAccountId: settleAccountId,
          amountMinor,
          settledAt: settleDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to settle receivable');
      }

      setSettleTarget(null);
      await fetchRecords();
    } catch (err: unknown) {
      setSettleError(err instanceof Error ? err.message : 'Failed to settle receivable');
    } finally {
      setSettling(false);
    }
  };

  const openSettleModal = (item: ReceivableItem) => {
    setSettleTarget(item);
    const majorVal = Number(BigInt(item.amountMinor)) / 100;
    setSettleAmount(majorVal.toFixed(2));
    setSettleDate(new Date().toISOString().split('T')[0]);
    setSettleError(null);
  };

  const openReceivables = records.filter(r => r.status === 'open' || r.status === 'partially_received');
  const totalOpenMinor = openReceivables.reduce((sum, r) => sum + BigInt(r.amountMinor), 0n);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Receivables</h1>
          <p className="text-sm text-muted-foreground">Track money owed to you and record incoming settlements.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Receivable
        </Button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Owed To You</p>
            <Amount valueMinor={totalOpenMinor} currency={records[0]?.currency || 'USD'} className="text-2xl font-bold text-positive" />
          </div>
          <div className="p-3 bg-positive/10 text-positive rounded-full">
            <ArrowDownLeft className="h-6 w-6" />
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Claims</p>
            <p className="text-2xl font-bold">{openReceivables.length} <span className="text-sm font-normal text-muted-foreground">open</span></p>
          </div>
          <div className="p-3 bg-muted text-muted-foreground rounded-full">
            <Clock className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Receivables List */}
      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading receivables...</Card>
      ) : records.length === 0 ? (
        <EmptyState
          icon={ArrowDownLeft}
          title="No receivables recorded"
          description="Track money you lent to friends, business invoices, or expected refunds."
          action={
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add First Receivable
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            const isSettled = r.status === 'received';
            const isPartial = r.status === 'partially_received';
            return (
              <Card key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/40 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">{r.counterpartyName}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      isSettled ? 'bg-positive/15 text-positive' : isPartial ? 'bg-amber-500/15 text-amber-500' : 'bg-primary/10 text-primary'
                    }`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Created: {r.createdDate}</span>
                    {r.expectedDate && <span>• Due: {r.expectedDate}</span>}
                    {r.note && <span>• Note: {r.note}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <Amount valueMinor={BigInt(r.amountMinor)} currency={r.currency} className="font-semibold text-lg" colorize="default" />
                  </div>
                  {!isSettled && (
                    <Button size="sm" variant="outline" onClick={() => openSettleModal(r)}>
                      <CheckCircle2 className="w-4 h-4 mr-1.5 text-positive" /> Settle
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Receivable Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-lg rounded-xl p-6 shadow-xl border border-border space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Add Receivable</h2>
                <p className="text-xs text-muted-foreground">Record money someone owes you.</p>
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
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Debtor / Counterparty *</label>
                <Input
                  placeholder="e.g. John Doe, ACME Corp"
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                  required
                />
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
                  <label className="text-xs font-medium">Expected Date (Optional)</label>
                  <Input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                </div>
              </div>

              {accounts.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Lent From Account (Optional)</label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No linked account (External claim)</option>
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
                  placeholder="e.g. Dinner split, invoice #1024"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Receivable'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Receivable Modal */}
      {settleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-xl border border-border space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Settle Receivable</h2>
                <p className="text-xs text-muted-foreground">Record repayment from {settleTarget.counterpartyName}.</p>
              </div>
              <button onClick={() => setSettleTarget(null)} className="p-1 rounded-md text-muted-foreground hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            {settleError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{settleError}</span>
              </div>
            )}

            <form onSubmit={handleSettle} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Destination Account *</label>
                <select
                  value={settleAccountId}
                  onChange={(e) => setSettleAccountId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">Account where repayment funds arrived.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Amount Received ({settleTarget.currency}) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Settled Date</label>
                <Input
                  type="date"
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setSettleTarget(null)}>Cancel</Button>
                <Button type="submit" disabled={settling}>
                  {settling ? 'Recording...' : 'Record Settlement'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
