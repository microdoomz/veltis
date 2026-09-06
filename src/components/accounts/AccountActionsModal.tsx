'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2, Trash2, AlertTriangle, Check, X, Calendar } from 'lucide-react';

const colorOptions = [
  { name: 'Emerald', value: '#10B981' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Slate', value: '#64748B' },
];

const accountTypes = [
  { id: 'bank', label: 'Bank Account' },
  { id: 'credit_card', label: 'Credit Card' },
  { id: 'digital_wallet', label: 'Digital Wallet' },
  { id: 'cash_wallet', label: 'Cash Wallet' },
  { id: 'investment', label: 'Investment' },
] as const;

interface AccountActionsProps {
  account: {
    id: string;
    name: string;
    institutionName?: string | null;
    accountType: string;
    currency: string;
    color?: string | null;
  };
}

export function AccountActionsModal({ account }: AccountActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Edit form state
  const [name, setName] = useState(account.name);
  const [institutionName, setInstitutionName] = useState(account.institutionName || '');
  const [accountType, setAccountType] = useState(account.accountType);
  const [currency, setCurrency] = useState(account.currency);
  const [color, setColor] = useState(account.color || colorOptions[0].value);
  const [sipMonthlyAmount, setSipMonthlyAmount] = useState<string>('');
  const [sipMonthlyDay, setSipMonthlyDay] = useState<string>('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current SIP details when edit modal is opened
  useEffect(() => {
    if (isEditOpen) {
      setName(account.name);
      setInstitutionName(account.institutionName || '');
      setAccountType(account.accountType);
      setCurrency(account.currency);
      setColor(account.color || colorOptions[0].value);
      
      fetch(`/api/accounts/${account.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.sipMonthlyAmount) {
            setSipMonthlyAmount(data.sipMonthlyAmount.toString());
          } else {
            setSipMonthlyAmount('');
          }
          if (data.sipMonthlyDay) {
            setSipMonthlyDay(data.sipMonthlyDay.toString());
          }
        })
        .catch(() => {});
    }
  }, [isEditOpen, account]);

  // Delete confirmation state
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Account name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        institutionName: institutionName.trim() || null,
        accountType,
        currency,
        color,
      };

      if (accountType === 'investment') {
        const parsedSipAmount = parseFloat(sipMonthlyAmount);
        if (!isNaN(parsedSipAmount) && parsedSipAmount > 0) {
          payload.sipMonthlyAmount = parsedSipAmount;
          payload.sipMonthlyDay = parseInt(sipMonthlyDay, 10) || 1;
        } else {
          payload.sipMonthlyAmount = 0;
        }
      }

      const res = await fetch(`/api/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update account');
      }

      setIsEditOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      setIsDeleteOpen(false);
      router.push('/accounts');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsEditOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit Details
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsDeleteOpen(true)}
          className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>
      </div>

      {/* Edit Account Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-6 space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h2 className="text-lg font-semibold tracking-tight">Edit Account Details</h2>
              <button 
                onClick={() => setIsEditOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Account Name *</label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Financial Institution</label>
                <Input 
                  value={institutionName} 
                  onChange={(e) => setInstitutionName(e.target.value)} 
                  placeholder="e.g. Chase, HDFC, Revolut"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Account Type</label>
                  <select 
                    value={accountType} 
                    onChange={(e) => setAccountType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {accountTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Currency</label>
                  <select 
                    value={currency} 
                    onChange={(e) => setCurrency(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="SGD">SGD ($)</option>
                  </select>
                </div>
              </div>

              {/* SIP Recurring Investment (Only for investment accounts) */}
              {accountType === 'investment' && (
                <div className="p-3.5 bg-muted/40 rounded-lg border border-border/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-primary" />
                      Monthly SIP Automation
                    </span>
                    <span className="text-xs text-muted-foreground">Optional</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Monthly SIP Amount</label>
                      <Input
                        type="number"
                        placeholder="e.g. 5000"
                        value={sipMonthlyAmount}
                        onChange={(e) => setSipMonthlyAmount(e.target.value)}
                        min="0"
                        step="any"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Day of Month (1 - 31)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 5"
                        value={sipMonthlyDay}
                        onChange={(e) => setSipMonthlyDay(e.target.value)}
                        min="1"
                        max="31"
                        disabled={!parseFloat(sipMonthlyAmount) || parseFloat(sipMonthlyAmount) <= 0}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Set an amount to automate your monthly recurring investment reminder. Set to 0 to remove SIP.
                  </p>
                </div>
              )}

              {/* Accent Color */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Accent Color Theme</label>
                <div className="flex items-center gap-3 pt-1">
                  {colorOptions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      style={{ backgroundColor: c.value }}
                      className={`h-7 w-7 rounded-full flex items-center justify-center transition-transform ${
                        color === c.value ? 'scale-110 ring-2 ring-primary ring-offset-2' : 'hover:scale-105'
                      }`}
                      title={c.name}
                    >
                      {color === c.value && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation & Disclaimer Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-destructive/30 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-destructive/10 rounded-full text-destructive">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">Delete Account: {account.name}?</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Please review the disclaimer below carefully.</p>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-destructive/10 border border-destructive/30 p-3.5 rounded-lg space-y-2 text-xs text-destructive dark:text-red-300 leading-relaxed">
              <p className="font-semibold text-destructive dark:text-red-200">⚠️ Critical Account Deletion Disclaimer:</p>
              <p>
                <strong>Even the amount and balance in this account will be deleted.</strong> Deleting this account will immediately remove its entire balance and all its active allocations from your Total Wealth, Net Worth, and Available Balance.
              </p>
              <p className="text-muted-foreground text-[11px]">
                In compliance with double-entry audit standards, past historical records will be archived, but this account will cease to hold any value in your finances.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                {error}
              </div>
            )}

            <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={deleteConfirmed} 
                onChange={(e) => setDeleteConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-border text-destructive focus:ring-destructive" 
              />
              <span className="text-xs font-medium text-foreground">
                I understand that the amount, balance, and allocations will be deleted from my totals.
              </span>
            </label>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setIsDeleteOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="danger" 
                size="sm" 
                disabled={!deleteConfirmed || loading}
                onClick={handleDelete}
              >
                {loading ? 'Deleting...' : 'Confirm & Delete Account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
