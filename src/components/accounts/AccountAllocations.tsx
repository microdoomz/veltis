'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Amount } from '@/components/ui/amount';
import { PiggyBank, Plus, Trash2, X, ShieldAlert, Sparkles, Layers } from 'lucide-react';

interface AllocationData {
  id: string;
  name: string;
  description: string | null;
  amountMinor: string;
  color: string | null;
}

interface AccountAllocationsProps {
  accountId: string;
  currency: string;
  totalBalanceMinor: bigint;
}

export function AccountAllocations({
  accountId,
  currency,
  totalBalanceMinor,
}: AccountAllocationsProps) {
  const [allocations, setAllocations] = useState<AllocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllocations = useCallback(async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/allocations`);
      if (res.ok) {
        const data = await res.json();
        setAllocations(data.allocations || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const totalAllocatedMinor = allocations.reduce(
    (sum, a) => sum + BigInt(a.amountMinor),
    0n
  );

  const availableMinor = totalBalanceMinor - totalAllocatedMinor;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/accounts/${accountId}/allocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          amount: parseFloat(amount),
          description: description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create allocation');
      }

      setName('');
      setAmount('');
      setDescription('');
      setIsAddOpen(false);
      await fetchAllocations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating allocation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (allocationId: string) => {
    try {
      const res = await fetch(
        `/api/accounts/${accountId}/allocations?allocationId=${allocationId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
      }
    } catch {
      // ignore
    }
  };

  const totalNum = Number(totalBalanceMinor);
  const allocatedPct =
    totalNum > 0 ? Math.min(100, Math.round((Number(totalAllocatedMinor) / totalNum) * 100)) : 0;

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base">Allocations & Set-Aside Money</CardTitle>
              <CardDescription className="text-xs">
                Reserve money inside this account for specific purposes without moving funds.
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsAddOpen(true);
              setError(null);
            }}
            className="flex items-center gap-1 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Set Aside Money
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Balances Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Account Balance
            </p>
            <p className="text-base font-bold text-foreground mt-0.5">
              <Amount valueMinor={totalBalanceMinor} currency={currency} />
            </p>
          </div>

          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Set Aside (Allocated)
            </p>
            <p className="text-base font-bold text-amber-700 dark:text-amber-300 mt-0.5">
              <Amount valueMinor={totalAllocatedMinor} currency={currency} />
            </p>
          </div>

          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Actual Available to Spend
            </p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
              <Amount valueMinor={availableMinor} currency={currency} />
            </p>
          </div>
        </div>

        {/* Progress Visual Bar */}
        {totalNum > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Allocated: {allocatedPct}%</span>
              <span>Free to Spend: {100 - allocatedPct}%</span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
              <div
                className="bg-amber-500 transition-all duration-300"
                style={{ width: `${allocatedPct}%` }}
              />
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${100 - allocatedPct}%` }}
              />
            </div>
          </div>
        )}

        {/* List of active allocations */}
        {loading ? (
          <p className="text-xs text-muted-foreground py-2">Loading allocations...</p>
        ) : allocations.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border rounded-xl text-xs text-muted-foreground space-y-1">
            <PiggyBank className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="font-medium text-foreground">No funds currently set aside in this account</p>
            <p className="text-muted-foreground">
              Set aside amounts for taxes, emergency cushions, or upcoming bills so you don&apos;t accidentally spend them.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {allocations.map((a) => (
              <div
                key={a.id}
                className="p-3 bg-card border border-border rounded-xl flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: a.color || '#F59E0B' }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{a.name}</p>
                    {a.description && (
                      <p className="text-[11px] text-muted-foreground truncate">{a.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="text-xs font-bold text-foreground">
                    <Amount valueMinor={BigInt(a.amountMinor)} currency={currency} />
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                    title="Remove set-aside allocation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* ADD ALLOCATION MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground text-base">Set Aside Money</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Purpose / Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tax Reserve, Emergency Cushion, Phone EMI"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Amount ({currency}) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  This amount will be deducted from your Available to Spend balance.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Notes (Optional)</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. For Q3 GST filing on 20th"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting || !name.trim() || !amount}>
                  {submitting ? 'Setting Aside...' : 'Confirm Allocation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
