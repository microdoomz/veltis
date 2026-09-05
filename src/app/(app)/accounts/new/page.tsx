'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, CreditCard, Wallet, TrendingUp, PiggyBank, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';

const accountTypes = [
  { id: 'bank', label: 'Bank Account', description: 'Checking or savings accounts', icon: Building2 },
  { id: 'credit_card', label: 'Credit Card', description: 'Revolving credit facilities', icon: CreditCard },
  { id: 'digital_wallet', label: 'Digital Wallet', description: 'PayPal, Apple Cash, etc.', icon: Wallet },
  { id: 'cash_wallet', label: 'Cash Wallet', description: 'Physical cash on hand', icon: PiggyBank },
  { id: 'investment', label: 'Investment', description: 'Brokerage and trading accounts', icon: TrendingUp },
] as const;

const colorOptions = [
  { name: 'Emerald', value: '#10B981' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Slate', value: '#64748B' },
];

export default function NewAccountPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<'bank' | 'cash_wallet' | 'digital_wallet' | 'investment' | 'credit_card'>('bank');
  const [name, setName] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [openingBalance, setOpeningBalance] = useState('');
  const [color, setColor] = useState(colorOptions[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Account name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          accountType,
          institutionName: institutionName.trim() || undefined,
          currency,
          balance: parseFloat(openingBalance) || 0,
          color,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create account');
      }

      router.push('/accounts');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link href="/accounts">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">New Account</h1>
          <p className="text-sm text-muted-foreground">Add a financial account to track your wealth.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Select an account type and enter initial balance details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                {error}
              </div>
            )}

            {/* Account Type Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {accountTypes.map((t) => {
                  const Icon = t.icon;
                  const isSelected = accountType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAccountType(t.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className={`p-2 rounded-md ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-none">{t.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Name *</label>
              <Input
                placeholder="e.g. Main Checking, Savings, Chase Sapphire"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Institution Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Financial Institution</label>
              <Input
                placeholder="e.g. Chase, Bank of America, HDFC, Revolut"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
              />
            </div>

            {/* Currency & Opening Balance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Opening Balance</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Initial balance on this account</p>
              </div>
            </div>

            {/* Color Theme */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Color Theme</label>
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
          </CardContent>
          <CardFooter className="flex justify-between gap-3 border-t border-border pt-6">
            <Link href="/accounts">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
