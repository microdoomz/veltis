'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth/client';
import { AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function DeleteAccountSection() {
  const router = useRouter();
  const [showPopup1, setShowPopup1] = useState(false);
  const [showPopup2, setShowPopup2] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenPopup1 = () => {
    setError(null);
    setShowPopup1(true);
    setShowPopup2(false);
    setConfirmInput('');
  };

  const handleProceedToPopup2 = () => {
    setShowPopup1(false);
    setShowPopup2(true);
    setConfirmInput('');
    setError(null);
  };

  const handleCancelAll = () => {
    setShowPopup1(false);
    setShowPopup2(false);
    setConfirmInput('');
    setError(null);
  };

  const handleConfirmDelete = async () => {
    if (confirmInput !== 'DELETE') return;
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Sign out from client-side state as well
      await authClient.signOut().catch(() => {});

      // Redirect to login
      window.location.href = '/login?deleted=true';
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting your account.');
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription className="text-destructive/80">
            Irreversible account and workspace deletion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Once you delete your account, your profile, authentication credentials, and all financial data across your workspace will be permanently erased. There is no going back.
          </p>

          <div>
            <Button
              variant="danger"
              onClick={handleOpenPopup1}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" /> Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Popup 1 */}
      {showPopup1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Delete Account?</h3>
                  <p className="text-xs text-muted-foreground">First Confirmation</p>
                </div>
              </div>
              <button
                onClick={handleCancelAll}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm leading-relaxed font-medium">
              All account will be gone with all data and can&apos;t be recovered. All transactions, accounts, investments, and settings will be permanently erased.
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to proceed? You will have one more opportunity to confirm before permanent deletion.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="outline" onClick={handleCancelAll}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleProceedToPopup2}>
                Proceed
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Popup 2 */}
      {showPopup2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-destructive/50 bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-destructive">Final Confirmation</h3>
                  <p className="text-xs text-muted-foreground">Type DELETE to confirm</p>
                </div>
              </div>
              <button
                onClick={handleCancelAll}
                disabled={loading}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm text-foreground">
                To confirm permanent deletion of your account and all associated data, please type <strong className="font-mono text-destructive">DELETE</strong> below:
              </p>
              <Input
                type="text"
                placeholder="DELETE"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                disabled={loading}
                className="font-mono tracking-widest text-center text-base"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="outline" onClick={handleCancelAll} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                loading={loading}
                disabled={confirmInput !== 'DELETE' || loading}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
