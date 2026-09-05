'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham' },
];

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking / Current Account' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'cash_wallet', label: 'Cash Wallet' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'digital_wallet', label: 'Digital Wallet (PayPal, Venmo, etc.)' },
  { value: 'investment', label: 'Investment Brokerage' },
];

export function OnboardingForm() {
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState('USD');
  const [accountType, setAccountType] = useState('checking');
  const [accountName, setAccountName] = useState('Main Checking');
  const [openingBalance, setOpeningBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    router.prefetch?.('/home');
  }, [router]);

  const handleNext = () => {
    setError('');
    setStep(step + 1);
  };
  const handlePrev = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!accountName.trim()) {
      setError('Please provide an account name');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountName.trim(),
          type: accountType,
          currency,
          balance: parseFloat(openingBalance) || 0,
          updateBaseCurrency: true,
        }),
      });

      if (res.ok) {
        router.push('/home');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to complete onboarding. Please try again.');
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-card rounded-xl border border-border shadow-sm">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Welcome to Veltis</h1>
        <p className="text-muted-foreground text-sm">
          Let&apos;s get your workspace set up (Step {step} of 2)
        </p>
        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-3">
          <div 
            className="bg-primary h-full transition-all duration-300 rounded-full"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select your Base Currency</label>
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol}) — {c.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              This will be the default reporting currency for your net wealth, available money, and dashboard analytics.
            </p>
          </div>
          <Button onClick={handleNext} className="w-full mt-4">
            Next: Add First Account
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Account Type</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Account Name</label>
            <Input 
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Main Checking, Chase Sapphire, Cash Wallet"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Starting Balance ({currency})</label>
            <Input 
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              You can adjust this later or record historical statements.
            </p>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={handlePrev} className="w-1/3" disabled={loading}>
              Back
            </Button>
            <Button onClick={handleSubmit} className="w-2/3" loading={loading}>
              {loading ? 'Creating Account...' : 'Complete Setup'}
            </Button>
          </div>
        </div>
      )}

      <div className="pt-2 text-center">
        <Link href="/home" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Skip setup for now &rarr; Explore Dashboard
        </Link>
      </div>
    </div>
  );
}
