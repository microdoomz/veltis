'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { InvestmentActions } from './InvestmentActions';
import { RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';

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

  // For simplicity, we just use the first account's currency or USD
  const baseCurrency = accounts[0]?.currency || 'USD';

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
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Estimated Value</p>
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

      <InvestmentActions workspaceId={workspaceId} accounts={accounts} positions={positions} onUpdate={fetchInvestments} />

      {/* Holdings */}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-8 mb-4">Holdings</h2>
      
      {positions.length === 0 ? (
        <div className="text-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <TrendingUp className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">No investment positions found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
