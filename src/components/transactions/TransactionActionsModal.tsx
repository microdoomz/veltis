'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateTransactionAction, deleteTransactionAction } from '@/app/actions/transaction';
import { Pencil, Trash2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CategoryOption {
  id: string;
  name: string;
}

interface AccountOption {
  id: string;
  name: string;
  currency: string;
}

interface TransactionActionsModalProps {
  workspaceId: string;
  transaction: {
    id: string;
    description?: string | null;
    merchantName?: string | null;
    amountMinor: bigint;
    currency: string;
    transactionDate: string;
    categoryId?: string | null;
    accountId?: string | null;
    type: string;
  };
  categories: CategoryOption[];
  accounts: AccountOption[];
}

export function TransactionActionsModal({
  workspaceId,
  transaction: txn,
  categories,
  accounts,
}: TransactionActionsModalProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [description, setDescription] = useState(txn.description || '');
  const [merchantName, setMerchantName] = useState(txn.merchantName || '');
  const [amount, setAmount] = useState((Number(txn.amountMinor) / 100).toFixed(2));
  const [date, setDate] = useState(txn.transactionDate);
  const [categoryId, setCategoryId] = useState(txn.categoryId || 'none');
  const [accountId, setAccountId] = useState(txn.accountId || (accounts[0]?.id || ''));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('transactionId', txn.id);
      formData.append('description', description);
      formData.append('merchantName', merchantName);
      formData.append('amount', amount);
      formData.append('date', date);
      formData.append('categoryId', categoryId);
      if (accountId) formData.append('accountId', accountId);

      await updateTransactionAction(workspaceId, formData);
      setIsEditOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await deleteTransactionAction(workspaceId, txn.id);
      setIsDeleteOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setIsEditOpen(true);
            setError(null);
          }}
          className="flex items-center gap-1.5"
        >
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          Edit Transaction
        </Button>

        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => {
            setIsDeleteOpen(true);
            setError(null);
            setDeleteConfirmed(false);
          }}
          className="flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>
      </div>

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-foreground text-base">Edit Transaction</h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
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

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Description *</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Grocery shopping"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Amount ({txn.currency}) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Date *</label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Merchant / Payee</label>
                <Input
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="e.g. Trader Joe's, Uber, Amazon"
                />
              </div>

              {categories.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
                  >
                    <option value="none">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {accounts.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Account</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold text-base text-foreground">Delete Transaction</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
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

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-2 text-foreground">
              <p className="font-semibold text-amber-600 dark:text-amber-400">
                Accounting Impact & Audit Safety
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Deleting this transaction will reverse its balance impact on your account and exclude it from all analytics calculations.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                In compliance with double-entry principles, the record is soft-deleted and preserved for audit trails.
              </p>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-border hover:bg-muted/40 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(e) => setDeleteConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <span className="text-xs text-foreground leading-normal">
                I understand and want to permanently delete this transaction ({txn.description || 'Transaction'}) of {txn.currency} {(Number(txn.amountMinor) / 100).toFixed(2)}.
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
                onClick={handleDeleteSubmit}
              >
                {loading ? 'Deleting...' : 'Confirm & Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
