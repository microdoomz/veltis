'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, X, DollarSign, Wallet, Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Position {
  id: string;
  name: string;
  symbol: string;
  units: string;
  averageCostMinor: string;
  currentPriceMinor: string;
  currency: string;
}

interface BankAccount {
  id: string;
  name: string;
  currency: string;
  accountType: string;
}

interface TopUpInvestmentModalProps {
  workspaceId: string;
  positions: Position[];
  preSelectedPositionId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TopUpInvestmentModal({
  workspaceId,
  positions,
  preSelectedPositionId,
  isOpen,
  onClose,
  onSuccess,
}: TopUpInvestmentModalProps) {
  const [selectedPosId, setSelectedPosId] = useState(preSelectedPositionId || positions[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preSelectedPositionId) {
      setSelectedPosId(preSelectedPositionId);
    } else if (!selectedPosId && positions.length > 0) {
      setSelectedPosId(positions[0].id);
    }
  }, [preSelectedPositionId, positions, selectedPosId]);

  useEffect(() => {
    if (!isOpen) return;
    async function loadAccounts() {
      try {
        const res = await fetch(`/api/accounts?workspaceId=${workspaceId}`);
        if (res.ok) {
          const accs = await res.json();
          // Filter to liquid spending accounts
          const liquid = accs.filter((a: BankAccount) => 
            ['bank', 'cash_wallet', 'digital_wallet'].includes(a.accountType)
          );
          setBankAccounts(liquid);
          if (liquid.length > 0 && !sourceAccountId) {
            setSourceAccountId(liquid[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load accounts for investment top-up', err);
      }
    }
    loadAccounts();
  }, [isOpen, workspaceId, sourceAccountId]);

  if (!isOpen) return null;

  const currentPos = positions.find((p) => p.id === selectedPosId) || positions[0];
  const navPrice = currentPos ? Number(currentPos.currentPriceMinor || currentPos.averageCostMinor || '1000') / 100 : 1;
  const amountNum = parseFloat(amount) || 0;
  const incrementalUnits = navPrice > 0 && amountNum > 0 ? (amountNum / navPrice).toFixed(4) : '0.0000';
  const existingUnits = currentPos ? parseFloat(currentPos.units || '0') : 0;
  const newTotalUnits = (existingUnits + parseFloat(incrementalUnits)).toFixed(4);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPos) {
      setError('Please select an investment fund');
      return;
    }
    if (amountNum <= 0) {
      setError('Please enter a valid investment amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const priceMinor = currentPos.currentPriceMinor || currentPos.averageCostMinor || '1000';
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          type: 'topup',
          positionId: currentPos.id,
          amountMinor: Math.round(amountNum * 100),
          priceMinor: Number(priceMinor),
          currency: currentPos.currency || 'USD',
          sourceAccountId: sourceAccountId || undefined,
          transactionDate: new Date().toISOString().split('T')[0],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record one-time investment');
      }

      setAmount('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record top-up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                One-Time Investment
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Invest a lump sum amount into an existing mutual fund or asset.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Select Fund */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Target Fund / Position
            </label>
            <select
              value={selectedPosId}
              onChange={(e) => setSelectedPosId(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.currency} {Number(p.currentPriceMinor || p.averageCostMinor) / 100} NAV)
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              Investment Amount ({currentPos?.currency || 'USD'})
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="h-11 text-base font-semibold"
            />
          </div>

          {/* Source Funding Account */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-primary" />
              Paid From (Bank / Wallet)
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Do not deduct from bank account (Direct Top-up)</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Optional: Selecting your bank account will record a debit transaction deducting this amount from your bank balance.
            </p>
          </div>

          {/* Real-time Calculation Summary */}
          {amountNum > 0 && currentPos && (
            <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2.5 text-xs animate-in fade-in">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Current Verified NAV:</span>
                <span className="font-semibold text-foreground font-mono">
                  {currentPos.currency} {navPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>New Units Purchased:</span>
                <span className="font-bold text-primary font-mono text-sm">
                  +{incrementalUnits} units
                </span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between items-center font-medium">
                <span className="text-foreground">Updated Total Holding:</span>
                <span className="font-bold text-foreground font-mono text-sm">
                  {newTotalUnits} units
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || amountNum <= 0}
              className="rounded-xl h-10 px-5 gap-1.5 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  Confirm One-Time Investment
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
