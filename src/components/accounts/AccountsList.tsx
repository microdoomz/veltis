'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { ListContainer, ListItem } from '@/components/ui/transitions';
import {
  Wallet,
  CreditCard,
  Building2,
  TrendingUp,
  PiggyBank,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Layers,
  Check,
  X,
  GripVertical,
  Loader2,
} from 'lucide-react';

export interface AccountItem {
  id: string;
  name: string;
  accountType: string;
  institutionName?: string | null;
  currency: string;
  color?: string | null;
  balanceMinor: bigint;
  displayOrder: number;
  totalAllocatedMinor?: bigint;
  freeToSpendMinor?: bigint;
  allocations?: Array<{
    id: string;
    name: string;
    amountMinor: bigint | string;
    color?: string | null;
    description?: string | null;
  }>;
}

const DEFAULT_TYPE_ORDER = ['bank', 'cash_wallet', 'digital_wallet', 'investment', 'credit_card'];

const TYPE_LABELS: Record<string, string> = {
  bank: 'Bank Accounts',
  cash_wallet: 'Cash Wallets',
  digital_wallet: 'Digital Wallets',
  investment: 'Investments',
  credit_card: 'Credit Cards',
};

function getAccountIcon(type: string) {
  switch (type) {
    case 'bank':
      return <Building2 className="h-5 w-5 text-primary" />;
    case 'cash_wallet':
      return <Wallet className="h-5 w-5 text-emerald-500" />;
    case 'digital_wallet':
      return <Wallet className="h-5 w-5 text-cyan-500" />;
    case 'investment':
      return <TrendingUp className="h-5 w-5 text-amber-500" />;
    case 'credit_card':
      return <CreditCard className="h-5 w-5 text-rose-500" />;
    default:
      return <Wallet className="h-5 w-5 text-muted-foreground" />;
  }
}

interface AccountsListProps {
  workspaceId?: string;
  initialAccounts: AccountItem[];
  savedAccountTypeOrder?: string[];
}

export function AccountsList({
  workspaceId,
  initialAccounts,
  savedAccountTypeOrder,
}: AccountsListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [accounts, setAccounts] = useState<AccountItem[]>(initialAccounts);
  const [accountTypeOrder, setAccountTypeOrder] = useState<string[]>(() => {
    const baseOrder = savedAccountTypeOrder && savedAccountTypeOrder.length > 0
      ? [...savedAccountTypeOrder]
      : [...DEFAULT_TYPE_ORDER];

    initialAccounts.forEach((acc) => {
      if (!baseOrder.includes(acc.accountType)) {
        baseOrder.push(acc.accountType);
      }
    });
    return baseOrder;
  });

  // Modal states
  const [isReorderAllOpen, setIsReorderAllOpen] = useState(false);
  const [isReorderGroupsOpen, setIsReorderGroupsOpen] = useState(false);
  const [tempAccounts, setTempAccounts] = useState<AccountItem[]>(initialAccounts);
  const [tempGroupOrder, setTempGroupOrder] = useState<string[]>(accountTypeOrder);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Drag states
  const [draggedAccountIdx, setDraggedAccountIdx] = useState<number | null>(null);
  const [draggedGroupIdx, setDraggedGroupIdx] = useState<number | null>(null);

  // Sync state if initialAccounts change
  React.useEffect(() => {
    setAccounts(initialAccounts);
    setTempAccounts(initialAccounts);
  }, [initialAccounts]);

  // Group accounts by type
  const grouped = React.useMemo(() => {
    const map = new Map<string, AccountItem[]>();
    accountTypeOrder.forEach((t) => map.set(t, []));

    accounts.forEach((acc) => {
      if (!map.has(acc.accountType)) {
        map.set(acc.accountType, []);
      }
      map.get(acc.accountType)!.push(acc);
    });

    return map;
  }, [accounts, accountTypeOrder]);

  // Persist individual account ordering
  const saveAccountOrder = async (orderedList: AccountItem[]) => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/accounts/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          accountIds: orderedList.map((a) => a.id),
          accountOrders: orderedList.map((a, idx) => ({ id: a.id, displayOrder: idx })),
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to save account order');
      }

      setAccounts(orderedList);
      setStatusMessage('Order saved successfully!');
      startTransition(() => {
        router.refresh();
      });
      setTimeout(() => {
        setIsReorderAllOpen(false);
        setStatusMessage(null);
      }, 500);
    } catch (e: unknown) {
      console.error('Failed to save account order', e);
      setStatusMessage((e as Error).message || 'Failed to save order');
    } finally {
      setIsSaving(false);
    }
  };

  // Persist group order
  const saveGroupOrder = async (newOrder: string[]) => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/workspace/account-types-order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, accountTypeOrder: newOrder }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to save group order');
      }

      setAccountTypeOrder(newOrder);
      setStatusMessage('Group order saved successfully!');
      startTransition(() => {
        router.refresh();
      });
      setTimeout(() => {
        setIsReorderGroupsOpen(false);
        setStatusMessage(null);
      }, 500);
    } catch (e: unknown) {
      console.error('Failed to save group order', e);
      setStatusMessage((e as Error).message || 'Failed to save group order');
    } finally {
      setIsSaving(false);
    }
  };

  // Drag & drop handlers for individual accounts in modal
  const handleDropAccount = (targetIdx: number) => {
    if (draggedAccountIdx === null || draggedAccountIdx === targetIdx) return;
    const next = [...tempAccounts];
    const [movedItem] = next.splice(draggedAccountIdx, 1);
    next.splice(targetIdx, 0, movedItem);
    setTempAccounts(next);
    setDraggedAccountIdx(null);
  };

  const moveTempAccount = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const next = [...tempAccounts];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      setTempAccounts(next);
    } else if (direction === 'down' && index < tempAccounts.length - 1) {
      const next = [...tempAccounts];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      setTempAccounts(next);
    }
  };

  // Drag & drop handlers for account groups in modal
  const handleDropGroup = (targetIdx: number) => {
    if (draggedGroupIdx === null || draggedGroupIdx === targetIdx) return;
    const next = [...tempGroupOrder];
    const [movedItem] = next.splice(draggedGroupIdx, 1);
    next.splice(targetIdx, 0, movedItem);
    setTempGroupOrder(next);
    setDraggedGroupIdx(null);
  };

  const moveTempGroup = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const next = [...tempGroupOrder];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      setTempGroupOrder(next);
    } else if (direction === 'down' && index < tempGroupOrder.length - 1) {
      const next = [...tempGroupOrder];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      setTempGroupOrder(next);
    }
  };

  const activeTypesWithAccounts = accountTypeOrder.filter(
    (t) => (grouped.get(t)?.length ?? 0) > 0
  );

  return (
    <div className="space-y-8">
      {/* Top Reorder Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 border border-border/80 rounded-xl">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-xs sm:text-sm font-medium text-foreground">Account Organization</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setTempGroupOrder([...accountTypeOrder]);
              setStatusMessage(null);
              setIsReorderGroupsOpen(true);
            }}
            className="text-xs h-8 px-2.5"
          >
            <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-primary" />
            Reorder Groups
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setTempAccounts([...accounts]);
              setStatusMessage(null);
              setIsReorderAllOpen(true);
            }}
            className="text-xs h-8 px-2.5"
          >
            <GripVertical className="w-3.5 h-3.5 mr-1 text-primary" />
            Global Account Order
          </Button>
        </div>
      </div>

      {/* Grouped Account Sections */}
      {activeTypesWithAccounts.map((type) => {
        const accs = grouped.get(type) || [];

        return (
          <div key={type} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {TYPE_LABELS[type] || type.replace('_', ' ')}
                </h2>
                <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded">
                  {accs.length}
                </span>
              </div>
            </div>

            <ListContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accs.map((acc) => {
                return (
                  <ListItem key={acc.id}>
                    <Card
                      className="h-full elevation-low hover:elevation-medium hover:border-primary/50 transition-all overflow-hidden relative group"
                      style={{ borderLeft: acc.color ? `4px solid ${acc.color}` : undefined }}
                    >
                      <div className="p-4 flex flex-col justify-between h-full gap-4">
                        <Link href={`/accounts/${acc.id}`} className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className="p-2 rounded-full shrink-0 mt-0.5"
                            style={{
                              backgroundColor: acc.color ? `${acc.color}20` : 'var(--muted)',
                              color: acc.color || 'inherit',
                            }}
                          >
                            {getAccountIcon(acc.accountType)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-medium text-sm leading-snug break-words">{acc.name}</p>
                              {acc.color && (
                                <span
                                  className="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-background shrink-0"
                                  style={{ backgroundColor: acc.color }}
                                  title="Accent Color"
                                />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 break-words">
                              {acc.institutionName || 'Manual Account'}
                            </p>
                          </div>
                        </Link>

                        <Link href={`/accounts/${acc.id}`} className="block">
                          <div className="flex justify-between items-end gap-2 pt-2 border-t border-border/40">
                            <span className="text-xs text-muted-foreground shrink-0">Total Balance</span>
                            <Amount
                              valueMinor={acc.balanceMinor}
                              currency={acc.currency}
                              className="font-semibold text-lg shrink-0 whitespace-nowrap"
                              colorize="default"
                            />
                          </div>

                          {acc.allocations && acc.allocations.length > 0 && (
                            <div className="pt-2.5 border-t border-border/60 space-y-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                  <PiggyBank className="w-3.5 h-3.5 text-amber-500" />
                                  Set Aside ({acc.allocations.length})
                                </span>
                                <Amount
                                  valueMinor={acc.totalAllocatedMinor || 0n}
                                  currency={acc.currency}
                                  className="font-medium text-amber-600 dark:text-amber-400 text-xs"
                                />
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {acc.allocations.map((al) => (
                                  <span
                                    key={al.id}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 border border-border/60 text-foreground flex items-center gap-1"
                                    title={al.description || al.name}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{ backgroundColor: al.color || '#F59E0B' }}
                                    />
                                    <span className="truncate max-w-[100px]">{al.name}:</span>
                                    <Amount valueMinor={BigInt(al.amountMinor)} currency={acc.currency} className="font-medium" />
                                  </span>
                                ))}
                              </div>

                              <div className="flex justify-between items-center text-xs pt-1 border-t border-border/40">
                                <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  Free to Spend
                                </span>
                                <Amount
                                  valueMinor={acc.freeToSpendMinor || 0n}
                                  currency={acc.currency}
                                  className="font-bold text-emerald-600 dark:text-emerald-400 text-xs"
                                />
                              </div>
                            </div>
                          )}
                        </Link>
                      </div>
                    </Card>
                  </ListItem>
                );
              })}
            </ListContainer>
          </div>
        );
      })}

      {/* Global Account Reorder Modal with Drag and Drop */}
      {isReorderAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg my-auto max-h-[88vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border shrink-0 bg-card">
              <div>
                <h3 className="text-lg font-bold">Global Account Order</h3>
                <p className="text-xs text-muted-foreground">
                  Drag and drop to reorder. The exact same order will appear on both Accounts and Home pages.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReorderAllOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {statusMessage && (
              <div className="mx-4 sm:mx-5 mt-3 p-2.5 text-xs rounded-lg bg-primary/10 border border-primary/20 text-primary font-medium shrink-0">
                {statusMessage}
              </div>
            )}

            <div className="p-4 sm:p-5 overflow-y-auto space-y-2 flex-1">
              {tempAccounts.map((acc, idx) => (
                <div
                  key={acc.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(idx));
                    setDraggedAccountIdx(idx);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropAccount(idx)}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors select-none ${
                    draggedAccountIdx === idx
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-card border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs font-mono font-bold text-muted-foreground w-5 text-right">
                      {idx + 1}.
                    </span>
                    <div
                      className="p-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: acc.color ? `${acc.color}20` : 'var(--muted)',
                        color: acc.color || 'inherit',
                      }}
                    >
                      {getAccountIcon(acc.accountType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{acc.name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {acc.accountType.replace('_', ' ')} • {acc.institutionName || 'Manual'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveTempAccount(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded border border-border/70 hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTempAccount(idx, 'down')}
                      disabled={idx === tempAccounts.length - 1}
                      className="p-1.5 rounded border border-border/70 hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 sm:p-5 border-t border-border flex items-center justify-between bg-card shrink-0">
              <span className="text-xs text-muted-foreground">
                {tempAccounts.length} account{tempAccounts.length === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsReorderAllOpen(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => saveAccountOrder(tempAccounts)} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5" /> Save Order
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Groups Modal with Drag and Drop */}
      {isReorderGroupsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md my-auto max-h-[88vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border shrink-0 bg-card">
              <div>
                <h3 className="text-lg font-bold">Reorder Account Groups</h3>
                <p className="text-xs text-muted-foreground">
                  Drag and drop to reorder which categories appear first on your Accounts page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReorderGroupsOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {statusMessage && (
              <div className="mx-4 sm:mx-5 mt-3 p-2.5 text-xs rounded-lg bg-primary/10 border border-primary/20 text-primary font-medium shrink-0">
                {statusMessage}
              </div>
            )}

            <div className="p-4 sm:p-5 overflow-y-auto space-y-2 flex-1">
              {tempGroupOrder.map((type, idx) => {
                const count = grouped.get(type)?.length ?? 0;
                return (
                  <div
                    key={type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(idx));
                      setDraggedGroupIdx(idx);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropGroup(idx)}
                    className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors select-none ${
                      draggedGroupIdx === idx
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-card border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono font-bold text-muted-foreground w-4">
                        {idx + 1}.
                      </span>
                      <div>
                        <p className="font-semibold text-sm">
                          {TYPE_LABELS[type] || type.replace('_', ' ')}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {count} {count === 1 ? 'account' : 'accounts'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveTempGroup(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTempGroup(idx, 'down')}
                        disabled={idx === tempGroupOrder.length - 1}
                        className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 sm:p-5 border-t border-border flex items-center justify-end gap-2 bg-card shrink-0">
              <Button variant="outline" size="sm" onClick={() => setIsReorderGroupsOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => saveGroupOrder(tempGroupOrder)} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" /> Save Groups Order
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
