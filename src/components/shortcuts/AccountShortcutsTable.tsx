'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

interface SpendingAccount {
  id: string;
  name: string;
  accountType: string;
  currency: string;
  color?: string | null;
  institutionName?: string | null;
}

export function AccountShortcutsTable({ accounts }: { accounts: SpendingAccount[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // fallback
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="p-4 bg-muted/40 rounded-lg text-xs text-muted-foreground text-center">
        No active bank or cash accounts found. Add an account in the Accounts tab first.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="p-3 bg-card rounded-lg border border-border flex items-center justify-between gap-2 shadow-2xs"
          >
            <div className="min-w-0 flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: acc.color || '#10B981' }}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{acc.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {acc.institutionName || acc.accountType.replace('_', ' ')} • {acc.currency}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleCopy(acc.id)}
              className="h-7 px-2.5 text-[11px] flex-shrink-0"
            >
              {copiedId === acc.id ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500 mr-1" />
                  Copied ID
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-muted-foreground mr-1" />
                  Copy ID
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
