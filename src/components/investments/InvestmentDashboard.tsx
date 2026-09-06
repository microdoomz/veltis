'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { InvestmentActions } from './InvestmentActions';
import { RefreshCw, TrendingUp, AlertTriangle, Plus, PlusCircle } from 'lucide-react';
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
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpPositionId, setTopUpPositionId] = useState<string | undefined>(undefined);

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
    // In V1, this loops over positions and triggers sync
    for (const pos of positions) {
      await fetch('/api/investments/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, positionId: pos.id }),
      });
    }
    fetchInvestments();
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
                disabled={loading}
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
            <p className={`text-3xl font-semibold mt-1 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isPositive ? '+' : ''}{(Number(totalGainMinor) / 100).toLocaleString('en-US', { style: 'currency', currency: baseCurrency })}
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-500" />
            Market values are estimated and may not reflect the exact real-time value.
          </p>
          <button 
            onClick={handleSyncPrices}
            className="flex items-center text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Sync Prices
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
                <th className="px-4 py-3 font-medium text-right">Units</th>
                <th className="px-4 py-3 font-medium text-right">Avg Cost</th>
                <th className="px-4 py-3 font-medium text-right">Current Price</th>
                <th className="px-4 py-3 font-medium text-right">Value</th>
                <th className="px-4 py-3 font-medium text-right">Gain</th>
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

                return (
                  <tr key={pos.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{pos.name}</div>
                      {pos.symbol && <div className="text-xs text-slate-500">{pos.symbol} • {pos.assetType.replace('_', ' ')}</div>}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-900 dark:text-slate-300 font-medium">{units}</td>
                    <td className="px-4 py-4 text-right text-slate-500">{(Number(avgCost)/100).toLocaleString('en-US', { style: 'currency', currency: pos.currency })}</td>
                    <td className="px-4 py-4 text-right text-slate-900 dark:text-slate-300">
                      {(Number(currentPrice)/100).toLocaleString('en-US', { style: 'currency', currency: pos.currency })}
                      {pos.isEstimated && <span className="text-[10px] ml-1 text-teal-600" title="Estimated">EST</span>}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-slate-900 dark:text-white">
                      {(Number(current)/100).toLocaleString('en-US', { style: 'currency', currency: pos.currency })}
                    </td>
                    <td className={`px-4 py-4 text-right font-medium ${posPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {posPositive ? '+' : ''}{(Number(gain)/100).toLocaleString('en-US', { style: 'currency', currency: pos.currency })}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => {
                          setTopUpPositionId(pos.id);
                          setIsTopUpOpen(true);
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors"
                      >
                        + Top Up
                      </button>
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
    </div>
  );
}
