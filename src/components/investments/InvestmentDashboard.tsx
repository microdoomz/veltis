'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { InvestmentActions } from './InvestmentActions';
import { RefreshCw, TrendingUp, AlertTriangle, Plus, PlusCircle, CheckCircle2, XCircle, Edit, Search, Loader2, X, Check } from 'lucide-react';
import { useCurrency } from '@/components/layout/CurrencyProvider';
import { TopUpInvestmentModal } from './TopUpInvestmentModal';
import Link from 'next/link';

interface InvestmentAccount {
  id: string;
  name: string;
  openingBalanceMinor: string;
  currency: string;
}

interface Position {
  id: string;
  financialAccountId: string;
  name: string;
  symbol: string;
  assetType: string;
  units: string;
  averageCostMinor: string;
  currentPriceMinor: string;
  currency: string;
  isEstimated: boolean;
}

export function InvestmentDashboard({ workspaceId }: { workspaceId: string }) {
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpPositionId, setTopUpPositionId] = useState<string | undefined>(undefined);

  // Edit Position Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    financialAccountId: '',
    positionId: '',
    name: '',
    symbol: '',
    units: '',
    currentPrice: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ schemeCode: number; schemeName: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchInvestments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/investments?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts);
        setPositions(data.positions);
      }
    } catch (e) {
      console.error('Failed to fetch investments', e);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInvestments();
  }, [fetchInvestments]);

  const handleSyncPrices = async () => {
    if (syncingPrices) return;
    setSyncingPrices(true);
    setSyncStatus(null);
    try {
      const res = await fetch('/api/investments/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncStatus({
          type: 'success',
          message: data.syncedCount !== undefined
            ? `Successfully synced latest NAV/prices for ${data.syncedCount} investment position(s).`
            : 'Market prices synced successfully.',
        });
      } else {
        setSyncStatus({
          type: 'error',
          message: data.error || (data.failedCount ? `Could not sync ${data.failedCount} position(s).` : 'Price sync failed.'),
        });
      }
      await fetchInvestments();
    } catch (e: unknown) {
      setSyncStatus({
        type: 'error',
        message: (e as Error).message || 'Network error syncing prices.',
      });
    } finally {
      setSyncingPrices(false);
      setTimeout(() => setSyncStatus(null), 6000);
    }
  };

  const handleOpenEditPosition = (pos: Position) => {
    setEditError(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDropdown(false);
    setEditForm({
      financialAccountId: pos.financialAccountId,
      positionId: pos.id,
      name: pos.name,
      symbol: pos.symbol || '',
      units: pos.units || '',
      currentPrice: pos.currentPriceMinor ? (Number(pos.currentPriceMinor) / 100).toString() : '',
    });
    setIsEditOpen(true);
  };

  const handleSearchScheme = async (q: string) => {
    setSearchQuery(q);
    if (!q || q.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSearchResults(data.slice(0, 8));
          setShowSearchDropdown(true);
        }
      }
    } catch {
      // silent
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectScheme = async (item: { schemeCode: number; schemeName: string }) => {
    setEditForm(prev => ({
      ...prev,
      name: item.schemeName,
      symbol: item.schemeCode.toString(),
    }));
    setShowSearchDropdown(false);
    setSearchQuery('');

    // Fetch latest NAV for this scheme code immediately
    try {
      const res = await fetch(`https://api.mfapi.in/mf/${item.schemeCode}/latest`);
      if (res.ok) {
        const d = await res.json();
        const latestNav = d?.data?.[0]?.nav;
        if (latestNav && !isNaN(parseFloat(latestNav))) {
          setEditForm(prev => ({ ...prev, currentPrice: parseFloat(latestNav).toFixed(2) }));
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSaveEditPosition = async () => {
    if (!editForm.financialAccountId) return;
    setIsSavingEdit(true);
    setEditError(null);
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name.trim() || undefined,
        symbol: editForm.symbol.trim() || null,
      };

      if (editForm.units !== '') {
        const parsedUnits = parseFloat(editForm.units);
        if (!isNaN(parsedUnits) && parsedUnits >= 0) {
          payload.units = parsedUnits;
        }
      }

      if (editForm.currentPrice !== '') {
        const parsedPrice = parseFloat(editForm.currentPrice);
        if (!isNaN(parsedPrice) && parsedPrice >= 0) {
          payload.currentPrice = parsedPrice;
        }
      }

      const res = await fetch(`/api/accounts/${editForm.financialAccountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update investment details.');
      }

      await fetchInvestments();
      setIsEditOpen(false);
    } catch (e: unknown) {
      setEditError((e as Error).message || 'Failed to update investment details.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
      <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
    </div>;
  }

  // Calculate totals
  let totalInvestedMinor = 0n;
  let totalCurrentValueMinor = 0n;

  positions.forEach(pos => {
    const units = Number(pos.units);
    const avgCost = BigInt(pos.averageCostMinor || 0);
    const currentPrice = BigInt(pos.currentPriceMinor || 0);

    const invested = BigInt(Math.round(units * Number(avgCost)));
    const current = BigInt(Math.round(units * Number(currentPrice)));

    totalInvestedMinor += invested;
    totalCurrentValueMinor += current;
  });

  const totalGainMinor = totalCurrentValueMinor - totalInvestedMinor;
  const isPositive = totalGainMinor >= 0n;
  const totalGainPct = totalInvestedMinor > 0n
    ? (Number(totalGainMinor) / Number(totalInvestedMinor)) * 100
    : 0;

  const { baseCurrency: workspaceCurrency } = useCurrency();
  const baseCurrency = accounts[0]?.currency || workspaceCurrency || 'USD';

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Invested</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-white mt-1">
              {(Number(totalInvestedMinor) / 100).toLocaleString('en-US', { style: 'currency', currency: baseCurrency })}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Estimated Value</p>
              <button
                type="button"
                onClick={fetchInvestments}
                disabled={loading || syncingPrices}
                title="Refresh investments"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>
            <p className="text-3xl font-semibold text-slate-900 dark:text-white mt-1">
              {(Number(totalCurrentValueMinor) / 100).toLocaleString('en-US', { style: 'currency', currency: baseCurrency })}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Gain / Loss</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className={`text-3xl font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isPositive ? '+' : ''}{(Number(totalGainMinor) / 100).toLocaleString('en-US', { style: 'currency', currency: baseCurrency })}
              </p>
              <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                ({isPositive ? '+' : ''}{totalGainPct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {syncStatus && (
          <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-xs font-medium animate-in fade-in ${
            syncStatus.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
          }`}>
            {syncStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{syncStatus.message}</span>
          </div>
        )}
        
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-500" />
            Market values are estimated and reflect verified NAV/price feeds.
          </p>
          <button 
            onClick={handleSyncPrices}
            disabled={syncingPrices || positions.length === 0}
            className="flex items-center text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${syncingPrices ? 'animate-spin' : ''}`} />
            {syncingPrices ? 'Syncing Prices...' : 'Sync Prices'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <InvestmentActions workspaceId={workspaceId} accounts={accounts} positions={positions} onUpdate={fetchInvestments} />
        <div className="flex items-center gap-2">
          {positions.length > 0 && (
            <button 
              onClick={() => {
                setTopUpPositionId(positions[0]?.id);
                setIsTopUpOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              One-Time Investment
            </button>
          )}
          <Link 
            href="/accounts/new" 
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Investment
          </Link>
        </div>
      </div>

      {/* Holdings */}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-8 mb-4">Holdings</h2>
      
      {positions.length === 0 ? (
        <div className="text-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <TrendingUp className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">No investment positions found.</p>
          <Link 
            href="/accounts/new" 
            className="inline-flex items-center text-sm font-semibold text-primary hover:underline"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add your first mutual fund or investment
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-xs">
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium text-right">Units Held</th>
                <th className="px-4 py-3 font-medium text-right">Avg Cost</th>
                <th className="px-4 py-3 font-medium text-right">Current Price</th>
                <th className="px-4 py-3 font-medium text-right">Current Value</th>
                <th className="px-4 py-3 font-medium text-right">Gain / Loss</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {positions.map(pos => {
                const units = Number(pos.units);
                const avgCost = BigInt(pos.averageCostMinor || 0);
                const currentPrice = BigInt(pos.currentPriceMinor || 0);
                
                const invested = BigInt(Math.round(units * Number(avgCost)));
                const current = BigInt(Math.round(units * Number(currentPrice)));
                const gain = current - invested;
                const posPositive = gain >= 0n;
                const gainPct = invested > 0n ? (Number(gain) / Number(invested)) * 100 : 0;

                return (
                  <tr key={pos.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{pos.name}</div>
                      {pos.symbol && <div className="text-xs text-slate-500">{pos.symbol} • {pos.assetType.replace('_', ' ')}</div>}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-900 dark:text-slate-300 font-medium">
                      {units.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-500">{(Number(avgCost)/100).toLocaleString('en-US', { style: 'currency', currency: pos.currency })}</td>
                    <td className="px-4 py-4 text-right text-slate-900 dark:text-slate-300">
                      {(Number(currentPrice)/100).toLocaleString('en-US', { style: 'currency', currency: pos.currency })}
                      {pos.isEstimated && <span className="text-[10px] ml-1 text-teal-600 font-semibold" title="Estimated">LIVE</span>}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-slate-900 dark:text-white">
                      {(Number(current)/100).toLocaleString('en-US', { style: 'currency', currency: pos.currency })}
                    </td>
                    <td className={`px-4 py-4 text-right font-medium ${posPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      <div>{posPositive ? '+' : ''}{(Number(gain)/100).toLocaleString('en-US', { style: 'currency', currency: pos.currency })}</div>
                      <div className="text-[11px] font-semibold opacity-90">({posPositive ? '+' : ''}{gainPct.toFixed(2)}%)</div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditPosition(pos)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium inline-flex items-center gap-1 transition-colors"
                          title="Edit scheme, NAV, or units"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setTopUpPositionId(pos.id);
                            setIsTopUpOpen(true);
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors"
                        >
                          + Top Up
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* One-Time Investment Top Up Modal */}
      <TopUpInvestmentModal
        workspaceId={workspaceId}
        positions={positions}
        preSelectedPositionId={topUpPositionId}
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        onSuccess={fetchInvestments}
      />

      {/* Edit Investment Position Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Edit Investment Position</h3>
                <p className="text-xs text-slate-500">Correct scheme, live NAV, or units held</p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Fund Search */}
              <div className="relative">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Search &amp; Pick Verified Scheme (MFAPI)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchScheme(e.target.value)}
                    placeholder="Search e.g. Nippon India Growth, Parag Parikh..."
                    className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                  />
                  {isSearching && (
                    <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                  )}
                </div>

                {showSearchDropdown && searchResults.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {searchResults.map((item) => (
                      <button
                        key={item.schemeCode}
                        type="button"
                        onClick={() => handleSelectScheme(item)}
                        className="w-full text-left px-3 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">{item.schemeName}</span>
                        <span className="text-[10px] text-slate-500 shrink-0 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {item.schemeCode}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Asset / Scheme Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Asset / Scheme Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                />
              </div>

              {/* Scheme Code / Symbol & Current Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Scheme Code / Symbol
                  </label>
                  <input
                    type="text"
                    value={editForm.symbol}
                    onChange={(e) => setEditForm(prev => ({ ...prev, symbol: e.target.value }))}
                    placeholder="e.g. 118668"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">MFAPI scheme code for auto-sync</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Current Price / NAV
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editForm.currentPrice}
                    onChange={(e) => setEditForm(prev => ({ ...prev, currentPrice: e.target.value }))}
                    placeholder="e.g. 4943.76"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Direct NAV or price in base currency</p>
                </div>
              </div>

              {/* Units Held */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Units Currently Held
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={editForm.units}
                  onChange={(e) => setEditForm(prev => ({ ...prev, units: e.target.value }))}
                  placeholder="e.g. 15.24"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Total units allocated across all investments in this fund</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                disabled={isSavingEdit}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditPosition}
                disabled={isSavingEdit}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:opacity-90 rounded-xl shadow-xs transition-opacity disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Position
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
