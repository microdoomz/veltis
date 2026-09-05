'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient, useSession } from '@/lib/auth/client';
import { CheckCircle2, AlertCircle, User, Building2, Globe, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'INR', name: 'Indian Rupee (₹)' },
  { code: 'JPY', name: 'Japanese Yen (¥)' },
  { code: 'CAD', name: 'Canadian Dollar (C$)' },
  { code: 'AUD', name: 'Australian Dollar (A$)' },
  { code: 'CHF', name: 'Swiss Franc (CHF)' },
  { code: 'SGD', name: 'Singapore Dollar (S$)' },
  { code: 'AED', name: 'UAE Dirham (AED)' },
];

export function ProfileSettings() {
  const { data: session, isPending: sessionLoading } = useSession();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [timezone, setTimezone] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

    async function loadProfileAndWorkspace() {
      try {
        setLoading(true);
        const res = await fetch('/api/workspace');
        if (res.ok) {
          const data = await res.json();
          if (data.workspace) {
            setWorkspaceName(data.workspace.name || '');
            setBaseCurrency(data.workspace.baseCurrency || 'USD');
          }
          if (data.user) {
            setName(data.user.name || '');
            setEmail(data.user.email || '');
          }
        } else if (session?.user) {
          setName(session.user.name || '');
          setEmail(session.user.email || '');
        }
      } catch (err: any) {
        console.error('Failed to load settings data', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfileAndWorkspace();
  }, [session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // 1. Update user profile name
      if (name.trim()) {
        const updateRes = await authClient.updateUser({
          name: name.trim(),
        });
        if (updateRes.error) {
          throw new Error(updateRes.error.message || 'Failed to update profile name');
        }
      }

      // 2. Update workspace settings
      const wsRes = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workspaceName.trim(),
          baseCurrency: baseCurrency.trim(),
        }),
      });

      if (!wsRes.ok) {
        const wsErr = await wsRes.json();
        throw new Error(wsErr.error || 'Failed to update workspace settings');
      }

      setMessage({ type: 'success', text: 'Profile and workspace preferences saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const initials = (name || email || 'V')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold text-xl tracking-tight border border-primary/25">
              {initials}
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                {name || 'User Profile'}
                {session?.user && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-normal">
                    <ShieldCheck className="h-3 w-3" /> Active
                  </span>
                )}
              </CardTitle>
              <CardDescription>{email || 'Personal Account'}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" /> Full Name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                disabled={loading || saving}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Primary identity email verified by Better Auth.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspace & Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Workspace & Preferences
          </CardTitle>
          <CardDescription>
            Configure your financial system of record settings, default currency, and regional format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Workspace Name</label>
              <Input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Personal Workspace"
                disabled={loading || saving}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Base Currency</label>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                disabled={loading || saving}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                All aggregate calculations (Total Liquid Wealth, Available Money) evaluate in this currency.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Date Format</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                disabled={loading || saving}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (International)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-muted-foreground" /> Timezone
              </label>
              <Input
                type="text"
                value={timezone}
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Automatically synced with your current browser locale.</p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border mt-4">
            <div className="text-xs text-muted-foreground">
              Want to mask amounts on public screens? Visit{' '}
              <Link href="/settings/privacy" className="text-primary underline hover:text-primary/80">
                Privacy Mode Settings
              </Link>
            </div>

            <Button onClick={handleSave} loading={saving} disabled={loading || saving} className="w-full sm:w-auto">
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
