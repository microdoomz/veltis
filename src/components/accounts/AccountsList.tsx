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
      return <Wallet className="h-5 w-5 text-teal-500" />;
    case 'credit_card':
      return <CreditCard className="h-5 w-5 text-rose-500" />;
    case 'investment':
      return <TrendingUp className="h-5 w-5 text-indigo-500" />;
    default:
      return <PiggyBank className="h-5 w-5 text-muted-foreground" />;
  }
}

interface AccountsListProps {
  workspaceId: string;
  initialAccounts: AccountItem[];
  savedAccountTypeOrder?: string[] | null;
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

    // Append any types from accounts that aren't in baseOrder
    initialAccounts.forEach((acc) => {
      if (!baseOrder.includes(acc.accountType)) {
        baseOrder.push(acc.accountType);
      }
    });
    return baseOrder;
  });

  const [isReorderAllOpen, setIsReorderAllOpen] = useState(false);
  const [isReorderGroupsOpen, setIsReorderGroupsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Group accounts by type while maintaining individual account order inside each group
  const grouped = React.useMemo(() => {
    const map = new Map<string, AccountItem[]>();
    // Pre-populate according to accountTypeOrder
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
  const saveAccountOrder = async (newAccounts: AccountItem[]) => {
    setAccounts(newAccounts);
    setIsSaving(true);
    try {
      const accountOrders = newAccounts.map((a, idx) => ({
        id: a.id,
        displayOrder: idx,
      }));

      await fetch('/api/accounts/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, accountOrders }),
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      console.error('Failed to save account order', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Persist group order
  const saveGroupOrder = async (newOrder: string[]) => {
    setAccountTypeOrder(newOrder);
    setIsSaving(true);
    try {
      await fetch('/api/workspace/account-types-order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, accountTypeOrder: newOrder }),
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      console.error('Failed to save group order', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Move individual account up/down within its group
  const moveAccountWithinGroup = (accountId: string, direction: 'up' | 'down') => {
    const accIndex = accounts.findIndex((a) => a.id === accountId);
    if (accIndex === -1) return;

    const targetAccount = accounts[accIndex];
    // Find previous/next account with the same type
    const sameTypeAccounts = accounts.filter((a) => a.accountType === targetAccount.accountType);
    const posInGroup = sameTypeAccounts.findIndex((a) => a.id === accountId);

    if (direction === 'up' && posInGroup > 0) {
      const neighbor = sameTypeAccounts[posInGroup - 1];
      const neighborGlobalIndex = accounts.findIndex((a) => a.id === neighbor.id);

      const next = [...accounts];
      next[accIndex] = neighbor;
      next[neighborGlobalIndex] = targetAccount;
      saveAccountOrder(next);
    } else if (direction === 'down' && posInGroup < sameTypeAccounts.length - 1) {
      const neighbor = sameTypeAccounts[posInGroup + 1];
      const neighborGlobalIndex = accounts.findIndex((a) => a.id === neighbor.id);

      const next = [...accounts];
      next[accIndex] = neighbor;
      next[neighborGlobalIndex] = targetAccount;
      saveAccountOrder(next);
    }
  };

  // Move individual account up/down globally
  const moveAccountGlobally = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const next = [...accounts];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      saveAccountOrder(next);
    } else if (direction === 'down' && index < accounts.length - 1) {
      const next = [...accounts];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      saveAccountOrder(next);
    }
  };

  // Move group up/down
  const moveGroup = (type: string, direction: 'up' | 'down') => {
    const activeTypes = accountTypeOrder.filter((t) => (grouped.get(t)?.length ?? 0) > 0);
    const index = activeTypes.indexOf(type);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const neighbor = activeTypes[index - 1];
      const newOrder = [...accountTypeOrder];
      const posA = newOrder.indexOf(type);
      const posB = newOrder.indexOf(neighbor);
      newOrder[posA] = neighbor;
      newOrder[posB] = type;
      saveGroupOrder(newOrder);
    } else if (direction === 'down' && index < activeTypes.length - 1) {
      const neighbor = activeTypes[index + 1];
      const newOrder = [...accountTypeOrder];
      const posA = newOrder.indexOf(type);
      const posB = newOrder.indexOf(neighbor);
      newOrder[posA] = neighbor;
      newOrder[posB] = type;
      saveGroupOrder(newOrder);
    }
  };

  const activeTypesWithAccounts = accountTypeOrder.filter(
    (t) => (grouped.get(t)?.length ?? 0) > 0
  );

  return (
    <div className="space-y-8">
      {/* Controls Bar */}
      {accounts.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/20 border border-border/60 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-medium text-foreground">Custom Ordering:</span>
            <span>Use arrows to rearrange accounts or groups. Order syncs with Home page.</span>
            {isSaving && <span className="text-primary font-medium animate-pulse">Saving...</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReorderGroupsOpen(true)}
              className="text-xs h-8"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Reorder Groups
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReorderAllOpen(true)}
              className="text-xs h-8"
            >
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Global Account Order
            </Button>
          </div>
        </div>
      )}

      {/* Account Groups according to saved accountTypeOrder */}
      {activeTypesWithAccounts.map((type, groupIdx) => {
        const accs = grouped.get(type) || [];
        const isFirstGroup = groupIdx === 0;
        const isLastGroup = groupIdx === activeTypesWithAccounts.length - 1;

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

              {/* Group reordering controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveGroup(type, 'up')}
                  disabled={isFirstGroup}
                  title="Move group up"
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveGroup(type, 'down')}
                  disabled={isLastGroup}
                  title="Move group down"
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            <ListContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accs.map((acc, accIdxInGroup) => {
                const isFirstInGroup = accIdxInGroup === 0;
                const isLastInGroup = accIdxInGroup === accs.length - 1;

                return (
                  <ListItem key={acc.id}>
                    <Card
                      className="h-full elevation-low hover:elevation-medium hover:border-primary/50 transition-all overflow-hidden relative group"
                      style={{ borderLeft: acc.color ? `4px solid ${acc.color}` : undefined }}
                    >
                      <div className="p-4 flex flex-col justify-between h-full gap-4">
                        <div className="flex items-start justify-between gap-2">
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

                          {/* Individual Account Reorder Buttons */}
                          {accs.length > 1 && (
                            <div className="flex items-center gap-0.5 shrink-0 pl-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  moveAccountWithinGroup(acc.id, 'up');
                                }}
                                disabled={isFirstInGroup}
                                title="Move account up"
                                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  moveAccountWithinGroup(acc.id, 'down');
                                }}
                                disabled={isLastInGroup}
                                title="Move account down"
                                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

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

      {/* Global Account Reorder Modal */}
      {isReorderAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Global Account Order</h3>
                <p className="text-xs text-muted-foreground">
                  Arrange all accounts. This order directly reflects on both Accounts and Home pages.
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

            <div className="overflow-y-auto space-y-2 divide-y divide-border/50 flex-1 pr-1">
              {accounts.map((acc, idx) => (
                <div key={acc.id} className="pt-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
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
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{acc.name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {acc.accountType.replace('_', ' ')} • {acc.institutionName || 'Manual'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveAccountGlobally(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded border border-border/70 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveAccountGlobally(idx, 'down')}
                      disabled={idx === accounts.length - 1}
                      className="p-1.5 rounded border border-border/70 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button onClick={() => setIsReorderAllOpen(false)} size="sm">
                <Check className="w-4 h-4 mr-1.5" /> Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Groups Modal */}
      {isReorderGroupsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Reorder Account Groups</h3>
                <p className="text-xs text-muted-foreground">
                  Choose which categories appear first on your Accounts page.
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

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {accountTypeOrder.map((type, idx) => {
                const count = grouped.get(type)?.length ?? 0;
                return (
                  <div
                    key={type}
                    className="p-2.5 rounded-lg border border-border flex items-center justify-between gap-3 bg-muted/20"
                  >
                    <div className="flex items-center gap-2 min-w-0">
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
                        onClick={() => {
                          if (idx > 0) {
                            const next = [...accountTypeOrder];
                            const temp = next[idx];
                            next[idx] = next[idx - 1];
                            next[idx - 1] = temp;
                            saveGroupOrder(next);
                          }
                        }}
                        disabled={idx === 0}
                        className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (idx < accountTypeOrder.length - 1) {
                            const next = [...accountTypeOrder];
                            const temp = next[idx];
                            next[idx] = next[idx + 1];
                            next[idx + 1] = temp;
                            saveGroupOrder(next);
                          }
                        }}
                        disabled={idx === accountTypeOrder.length - 1}
                        className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button onClick={() => setIsReorderGroupsOpen(false)} size="sm">
                <Check className="w-4 h-4 mr-1.5" /> Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
