'use client';

import { useState } from 'react';
import { addShortcutTokenAction } from '@/app/actions/shortcut';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Copy, Check, ShieldCheck } from 'lucide-react';

export function CreateShortcutForm({ workspaceId }: { workspaceId: string }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    setSecret(null);
    setCopied(false);
    try {
      const formData = new FormData();
      formData.append('name', name);
      const res = await addShortcutTokenAction(workspaceId, formData);
      setSecret(res.rawToken);
      setName('');
    } catch (err) {
      console.error(err);
      alert('Failed to create token');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      setCopied(true);
    }
  };

  return (
    <Card className="p-4 mb-6">
      <h3 className="font-semibold mb-2 text-foreground">Create New Token</h3>
      {secret ? (
        <div className="bg-emerald-950/10 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-emerald-950 dark:text-emerald-200 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Token created successfully!
            </p>
            <span className="text-[11px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-medium px-2.5 py-0.5 rounded-full">
              One-time view
            </span>
          </div>
          <p className="text-xs text-emerald-900/80 dark:text-emerald-300/80">
            Copy this token now. For security, you will not be able to see it again after closing this card.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <code className="flex-1 bg-emerald-50 dark:bg-neutral-900 text-neutral-950 dark:text-emerald-200 font-mono text-xs font-bold p-3 border border-emerald-400/50 rounded-lg select-all break-all shadow-sm">
              {secret}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-10 px-4 bg-background border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 font-medium flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1.5 text-muted-foreground" />
                  Copy Token
                </>
              )}
            </Button>
          </div>
          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={() => setSecret(null)}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., iPhone Personal"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </form>
      )}
    </Card>
  );
}
