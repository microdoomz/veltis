'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrency } from '@/components/layout/CurrencyProvider';
import { 
  Building2, 
  CreditCard, 
  Wallet, 
  TrendingUp, 
  PiggyBank, 
  ArrowLeft, 
  Check, 
  CheckCircle2,
  Search, 
  Sparkles, 
  RefreshCw,
  Repeat
} from 'lucide-react';
import Link from 'next/link';

const accountTypes = [
  { id: 'bank', label: 'Bank Account', description: 'Checking or savings accounts', icon: Building2 },
  { id: 'credit_card', label: 'Credit Card', description: 'Revolving credit facilities', icon: CreditCard },
  { id: 'digital_wallet', label: 'Digital Wallet', description: 'PayPal, Apple Cash, etc.', icon: Wallet },
  { id: 'cash_wallet', label: 'Cash Wallet', description: 'Physical cash on hand', icon: PiggyBank },
  { id: 'investment', label: 'Investment', description: 'Mutual funds, SIPs, stocks & ETFs', icon: TrendingUp },
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
  const { baseCurrency } = useCurrency();

  const [accountType, setAccountType] = useState<'bank' | 'cash_wallet' | 'digital_wallet' | 'investment' | 'credit_card'>('bank');
  const [name, setName] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [currency, setCurrency] = useState(baseCurrency || 'USD');
  const [openingBalance, setOpeningBalance] = useState('');
  const [color, setColor] = useState(colorOptions[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Investment specific state
  const [sipMonthlyAmount, setSipMonthlyAmount] = useState('');
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [liveSymbol, setLiveSymbol] = useState<string | null>(null);
  const [livePriceDate, setLivePriceDate] = useState<string | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quoteNotice, setQuoteNotice] = useState<string | null>(null);
  const [matches, setMatches] = useState<Array<{ name: string; symbol: string }>>([]);
  const [selectedFund, setSelectedFund] = useState<{
    name: string;
    symbol: string;
    nav?: number;
    date?: string;
    provider?: string;
  } | null>(null);

  // Sync currency with workspace baseCurrency once loaded if user hasn't changed it
  useEffect(() => {
    if (baseCurrency) {
      setCurrency(baseCurrency);
    }
  }, [baseCurrency]);

  const handleFetchQuote = async (fundNameQuery?: string, schemeCode?: string) => {
    const q = fundNameQuery || name;
    if (!q.trim() && !schemeCode) return;

    setIsFetchingQuote(true);
    setQuoteNotice(null);

    try {
      const url = schemeCode
        ? `/api/investments/quote?schemeCode=${encodeURIComponent(schemeCode)}&query=${encodeURIComponent(q.trim())}`
        : `/api/investments/quote?query=${encodeURIComponent(q.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.found && data.currentPrice) {
        setLivePrice(data.currentPrice);
        setLiveSymbol(data.symbol || schemeCode || null);
        setLivePriceDate(data.date || null);
        if (data.currency) setCurrency(data.currency);
        
        // If schemeCode was explicitly selected by user, preserve that exact name and symbol
        const resolvedName = schemeCode ? q.trim() : (data.name || q.trim());
        setName(resolvedName);
        setSelectedFund({
          name: resolvedName,
          symbol: data.symbol || schemeCode || '',
          nav: data.currentPrice,
          date: data.date,
          provider: data.provider,
        });
        const sourceInfo = data.consensusCount ? `4-source consensus (${data.consensusCount} sources matched)` : (data.provider || 'Live Registry');
        setQuoteNotice(`Live NAV verified via ${sourceInfo}: ${data.currency || currency} ${data.currentPrice} (${data.date || 'Today'})`);
        if (data.allMatches && !schemeCode) {
          setMatches(data.allMatches);
        }
      } else {
        setQuoteNotice(data.message || 'Could not fetch live NAV automatically. You can proceed with manual tracking.');
      }
    } catch {
      setQuoteNotice('Could not connect to live market data. Proceeding with manual invested balance.');
    } finally {
      setIsFetchingQuote(false);
    }
  };

  const isInvestment = accountType === 'investment';

  // Calculated investment metrics
  const totalInvestedNum = parseFloat(openingBalance) || 0;
  const currentNav = livePrice || 0;
  const calculatedUnits = currentNav > 0 && totalInvestedNum > 0 ? (totalInvestedNum / currentNav) : 0;
  const estimatedCurrentValue = currentNav > 0 && calculatedUnits > 0 ? calculatedUnits * currentNav : totalInvestedNum;
  const estimatedGain = estimatedCurrentValue - totalInvestedNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(isInvestment ? 'Mutual fund full name is required' : 'Account name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        accountType,
        institutionName: institutionName.trim() || undefined,
        currency,
        balance: totalInvestedNum,
        color,
      };

      if (isInvestment) {
        payload.symbol = liveSymbol || undefined;
        payload.currentPrice = currentNav > 0 ? currentNav : undefined;
        payload.units = calculatedUnits > 0 ? calculatedUnits.toFixed(4) : undefined;
        if (parseFloat(sipMonthlyAmount) > 0) {
          payload.sipMonthlyAmount = parseFloat(sipMonthlyAmount);
        }
      }

      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
          <p className="text-sm text-muted-foreground">
            {isInvestment 
              ? 'Add a mutual fund holding to track total wealth, live NAV, and monthly SIPs.' 
              : 'Add a financial account to track your money and net wealth.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{isInvestment ? 'Investment Details' : 'Account Details'}</CardTitle>
            <CardDescription>
              {isInvestment
                ? 'Specify the mutual fund name, currency, total invested amount, and monthly SIP commitment.'
                : 'Select an account type and enter initial balance details.'}
            </CardDescription>
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
                      onClick={() => {
                        setAccountType(t.id);
                        setError(null);
                      }}
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

            {/* DYNAMIC FORM FIELDS */}
            {isInvestment ? (
              /* INVESTMENT SPECIFIC FIELDS */
              <div className="space-y-5 border-t border-border pt-5">
                {/* Fund Name & Live Lookup */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Mutual Fund Full Name *</label>
                    <button
                      type="button"
                      onClick={() => handleFetchQuote()}
                      disabled={isFetchingQuote || !name.trim()}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      {isFetchingQuote ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      Fetch Live NAV
                    </button>
                  </div>

                  {/* Confirmed Selection Badge */}
                  {selectedFund && (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                            {selectedFund.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-emerald-800 dark:text-emerald-300">
                            {selectedFund.symbol && <span>Code: <strong>{selectedFund.symbol}</strong></span>}
                            {livePrice && <span>• NAV: <strong>{currency} {livePrice}</strong></span>}
                            {livePriceDate && <span>• As of {livePriceDate}</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFund(null);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1 rounded border border-border hover:bg-muted/80 flex-shrink-0 transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      placeholder="e.g. Parag Parikh Flexi Cap Fund - Direct Plan - Growth"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (selectedFund && e.target.value !== selectedFund.name) {
                          setSelectedFund(null);
                        }
                      }}
                      onBlur={() => {
                        if (name.trim().length > 3 && !livePrice) {
                          handleFetchQuote();
                        }
                      }}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Please enter the official full name of the mutual fund or ETF.
                  </p>

                  {/* Search Matches dropdown suggestions */}
                  {matches.length > 0 && (
                    <div className="bg-card border border-border rounded-lg p-2 space-y-1 shadow-sm mt-1">
                      <div className="flex items-center justify-between px-2 py-1">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                          Available Matches ({matches.length})
                        </p>
                        <span className="text-[10px] text-muted-foreground">Click to select</span>
                      </div>
                      {matches.map((m) => {
                        const isThisSelected = selectedFund?.symbol === m.symbol || name.trim() === m.name.trim();
                        return (
                          <button
                            key={m.symbol}
                            type="button"
                            onClick={() => {
                              setName(m.name);
                              setSelectedFund({
                                name: m.name,
                                symbol: m.symbol,
                                nav: livePrice || undefined,
                              });
                              handleFetchQuote(m.name, m.symbol);
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition-colors flex items-center justify-between border ${
                              isThisSelected
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200 font-semibold shadow-2xs'
                                : 'border-transparent hover:bg-muted text-foreground'
                            }`}
                          >
                            <span className="truncate pr-2">{m.name}</span>
                            {isThisSelected ? (
                              <span className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-bold gap-1 flex-shrink-0">
                                <Check className="w-3.5 h-3.5" /> Selected
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">Select</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {quoteNotice && (
                    <p className="text-xs font-medium text-teal-600 dark:text-teal-400 flex items-center gap-1.5 mt-1">
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                      {quoteNotice}
                    </p>
                  )}
                </div>

                {/* Currency & Total Invested */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="SGD">SGD ($)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Total Invested Amount *</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 50000"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Total money you have invested so far</p>
                  </div>
                </div>

                {/* Monthly SIP Amount */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Repeat className="w-4 h-4 text-primary" />
                    <label className="text-sm font-medium">SIP Each Month</label>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 5000 (Optional)"
                    value={sipMonthlyAmount}
                    onChange={(e) => setSipMonthlyAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    If you have a recurring monthly SIP, enter the monthly instalment amount.
                  </p>
                </div>

                {/* Live Valuation & Position Summary Card */}
                {totalInvestedNum > 0 && (
                  <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>Investment Overview & Market Value</span>
                      {livePriceDate && <span>NAV Date: {livePriceDate}</span>}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <p className="text-xs text-muted-foreground">Invested Amount</p>
                        <p className="text-base font-bold text-foreground font-mono">
                          {currency} {totalInvestedNum.toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Current NAV / Price</p>
                        <p className="text-base font-bold text-primary font-mono">
                          {currentNav > 0 ? `${currency} ${currentNav}` : 'Tracking at cost'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Est. Current Value</p>
                        <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {currency} {estimatedCurrentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {currentNav > 0 && calculatedUnits > 0 && (
                      <div className="text-xs text-muted-foreground pt-1 border-t border-border/50 flex justify-between">
                        <span>Calculated Units: <strong className="text-foreground">{calculatedUnits.toFixed(4)}</strong></span>
                        {estimatedGain !== 0 && (
                          <span className={estimatedGain >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                            {estimatedGain >= 0 ? `+${currency} ${estimatedGain.toFixed(2)}` : `-${currency} ${Math.abs(estimatedGain).toFixed(2)}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* STANDARD ACCOUNT FIELDS (Bank, Card, Wallet) */
              <div className="space-y-4">
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
                      className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
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
              </div>
            )}

            {/* Color Theme (Shared across all account types) */}
            <div className="space-y-2 border-t border-border pt-4">
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
              {loading ? 'Creating...' : isInvestment ? 'Add Investment' : 'Create Account'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
