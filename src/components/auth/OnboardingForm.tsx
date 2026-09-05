'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

export function OnboardingForm() {
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState('USD');
  const [accountName, setAccountName] = useState('Checking');
  const [openingBalance, setOpeningBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Create initial account via API
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountName,
          type: 'checking',
          currency,
          balance: parseFloat(openingBalance) || 0,
          updateBaseCurrency: true,
        })
      });

      if (res.ok) {
        // Also we would save the preferred base currency to the user's settings
        router.push('/home');
      } else {
        alert('Failed to complete onboarding');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-card rounded-xl border border-border shadow-sm">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Welcome to Veltis</h1>
        <p className="text-muted-foreground text-sm">Let's get your workspace set up (Step {step} of 2)</p>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select your Base Currency</label>
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
            <p className="text-xs text-muted-foreground">This is the default currency for your reports and dashboard.</p>
          </div>
          <Button onClick={handleNext} className="w-full mt-4">Next</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name your first account</label>
            <Input 
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Checking Account"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Opening Balance ({currency})</label>
            <Input 
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">You can change this later.</p>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={handlePrev} className="w-1/3">Back</Button>
            <Button onClick={handleSubmit} className="w-2/3" disabled={loading}>
              {loading ? 'Saving...' : 'Complete Setup'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
