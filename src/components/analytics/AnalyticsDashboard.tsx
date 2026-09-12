'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { ExportConfigModal } from '../exports/ExportConfigModal';

// Lazy loaded charts
const CategoryPieChart = dynamic(() => import('./Charts').then(mod => mod.CategoryPieChart), { 
  ssr: false, 
  loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> 
});
const WealthTrendChart = dynamic(() => import('./Charts').then(mod => mod.WealthTrendChart), { 
  ssr: false, 
  loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> 
});
const BudgetBarChart = dynamic(() => import('./Charts').then(mod => mod.BudgetBarChart), { 
  ssr: false, 
  loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> 
});

type TimeFilterRange = 'this_month' | 'last_month' | 'ytd' | 'all_time' | 'custom';

export function AnalyticsDashboard({ workspaceId, baseCurrency }: { workspaceId: string, baseCurrency: string }) {
  const [timeFilter, setTimeFilter] = useState<TimeFilterRange>('this_month');
  const [activeTab, setActiveTab] = useState('overview');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const router = import('next/navigation').then(mod => mod.useRouter);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [overview, setOverview] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [spending, setSpending] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [income, setIncome] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [wealth, setWealth] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [investments, setInvestments] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [budgets, setBudgets] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async (tab: string) => {
    if (!workspaceId) return;
    setIsLoading(true);
    
    const now = new Date();
    let startDate = new Date('2000-01-01').toISOString();
    let endDate = new Date('2100-01-01').toISOString();

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}T00:00:00.000Z`;
    };

    if (timeFilter === 'this_month') {
      startDate = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
      endDate = formatDate(now);
    } else if (timeFilter === 'last_month') {
      startDate = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      endDate = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (timeFilter === 'ytd') {
      startDate = formatDate(new Date(now.getFullYear(), 0, 1));
      endDate = formatDate(now);
    } else if (timeFilter === 'custom') {
      startDate = customStartDate ? new Date(customStartDate).toISOString() : new Date('2000-01-01').toISOString();
      endDate = customEndDate ? new Date(customEndDate).toISOString() : new Date('2100-01-01').toISOString();
    }

    const params = new URLSearchParams({
      workspaceId,
      startDate,
      endDate
    });

    try {
      if (tab === 'overview') {
        const res = await fetch(`/api/analytics/overview?${params}`);
        if (res.ok) setOverview(await res.json());
      } else if (tab === 'spending') {
        const res = await fetch(`/api/analytics/spending?${params}`);
        if (res.ok) setSpending(await res.json());
      } else if (tab === 'income') {
        const res = await fetch(`/api/analytics/income?${params}`);
        if (res.ok) setIncome(await res.json());
      } else if (tab === 'wealth') {
        const res = await fetch(`/api/analytics/wealth?${params}`);
        if (res.ok) setWealth(await res.json());
      } else if (tab === 'investments') {
        // Fetch directly from the investments endpoint for guaranteed 100% accuracy and consistency
        const res = await fetch(`/api/investments?workspaceId=${workspaceId}`);
        if (res.ok) {
          const data = await res.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawPositions: any[] = data.positions || [];
          let totalInvestedMinor = 0n;
          let totalCurrentValueMinor = 0n;

          const enrichedPositions = rawPositions.map((pos) => {
            const units = Number(pos.units || 0);
            const avgCost = BigInt(pos.averageCostMinor || 0);
            const currentPrice = BigInt(pos.currentPriceMinor || pos.averageCostMinor || 0);

            const invested = BigInt(Math.round(units * Number(avgCost)));
            const current = BigInt(Math.round(units * Number(currentPrice)));
            const gain = current - invested;
            const gainPct = invested > 0n ? (Number(gain) / Number(invested)) * 100 : 0;

            totalInvestedMinor += invested;
            totalCurrentValueMinor += current;

            return {
              id: pos.id,
              name: pos.name,
              symbol: pos.symbol,
              assetType: pos.assetType,
              units: pos.units,
              averageCostMinor: pos.averageCostMinor?.toString(),
              currentPriceMinor: currentPrice.toString(),
              estimatedValueMinor: current.toString(),
              totalCostPosition: invested.toString(),
              unrealizedGainLoss: gain.toString(),
              unrealizedGainLossPct: gainPct,
              currency: pos.currency,
              isEstimated: pos.isEstimated,
            };
          });

          const totalGain = totalCurrentValueMinor - totalInvestedMinor;
          const totalGainPct = totalInvestedMinor > 0n
            ? (Number(totalGain) / Number(totalInvestedMinor)) * 100
            : 0;

          setInvestments({
            positions: enrichedPositions,
            summary: {
              totalValueMinor: totalCurrentValueMinor.toString(),
              totalCostMinor: totalInvestedMinor.toString(),
              totalUnrealizedGainLoss: totalGain.toString(),
              totalGainPct,
              isPositive: totalGain >= 0n,
            },
          });
        }
      } else if (tab === 'budgets') {
        const res = await fetch(`/api/analytics/budgets?${params}`);
        if (res.ok) setBudgets(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch analytics', e);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, timeFilter, customStartDate, customEndDate]);

  useEffect(() => {
    if (!workspaceId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(activeTab);
  }, [workspaceId, activeTab, timeFilter, customStartDate, customEndDate, fetchData]);

  const handleCategoryClick = async (categoryId: string) => {
    const r = await router;
    const rInstance = r();
    if (!categoryId || categoryId === 'uncategorized') {
      rInstance.push('/transactions');
    } else {
      rInstance.push(`/transactions?category=${categoryId}`);
    }
  };

  const formatCurrency = (amountMinorStr: string) => {
    return (Number(amountMinorStr) / 100).toLocaleString('en-US', { style: 'currency', currency: baseCurrency || 'USD' });
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'spending', label: 'Spending' },
    { id: 'income', label: 'Income' },
    { id: 'wealth', label: 'Net Wealth' },
    { id: 'investments', label: 'Investments' },
    { id: 'budgets', label: 'Budgets' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">Gain insights into your financial health.</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="flex h-10 w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value as TimeFilterRange)}
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="ytd">Year to Date</option>
            <option value="all_time">All Time</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {timeFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
              <span>-</span>
              <input type="date" className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
            </div>
          )}

          <Button variant="outline" onClick={() => setIsExportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex overflow-x-auto space-x-1 bg-muted p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview ? formatCurrency(overview.totalSpending) : <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {overview ? formatCurrency(overview.totalIncome) : <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview ? formatCurrency(overview.netDifference) : <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'spending' && (
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : <CategoryPieChart data={spending} onCategoryClick={handleCategoryClick} />}
            </CardContent>
          </Card>
        )}

        {activeTab === 'income' && (
          <Card>
            <CardHeader>
              <CardTitle>Income by Source</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : <CategoryPieChart data={income} onCategoryClick={handleCategoryClick} />}
            </CardContent>
          </Card>
        )}

        {activeTab === 'wealth' && (
          <Card>
            <CardHeader>
              <CardTitle>Wealth Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : <WealthTrendChart data={wealth} />}
            </CardContent>
          </Card>
        )}

        {activeTab === 'investments' && (
          <Card>
            <CardHeader>
              <CardTitle>Investment Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                      <div className="text-xs font-medium text-muted-foreground">Estimated Total Value</div>
                      <div className="text-2xl font-bold tracking-tight text-foreground mt-1">
                        {investments ? formatCurrency(investments.summary.totalValueMinor) : '-'}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                      <div className="text-xs font-medium text-muted-foreground">Total Invested (Cost Basis)</div>
                      <div className="text-2xl font-bold tracking-tight text-foreground mt-1">
                        {investments ? formatCurrency(investments.summary.totalCostMinor) : '-'}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                      <div className="text-xs font-medium text-muted-foreground">Total Gain / Loss</div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-2xl font-bold tracking-tight ${investments && Number(investments.summary.totalUnrealizedGainLoss) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {investments ? `${Number(investments.summary.totalUnrealizedGainLoss) >= 0 ? '+' : ''}${formatCurrency(investments.summary.totalUnrealizedGainLoss)}` : '-'}
                        </span>
                        {investments?.summary?.totalGainPct !== undefined && (
                          <span className={`text-xs font-semibold ${Number(investments.summary.totalUnrealizedGainLoss) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            ({Number(investments.summary.totalUnrealizedGainLoss) >= 0 ? '+' : ''}{investments.summary.totalGainPct.toFixed(2)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* List of positions */}
                  <div className="mt-6 border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-base">Holdings ({investments?.positions?.length || 0})</h4>
                    </div>
                    {!investments?.positions || investments.positions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">No active investment positions found.</p>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {investments.positions.map((pos: any) => {
                          const isPos = Number(pos.unrealizedGainLoss) >= 0;
                          return (
                            <div key={pos.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2">
                              <div className="space-y-0.5">
                                <div className="font-medium text-sm text-foreground flex items-center gap-2">
                                  <span>{pos.name}</span>
                                  {pos.isEstimated && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold" title="Live NAV feed">
                                      LIVE
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                                  {pos.symbol && <span className="font-mono bg-muted/60 px-1 rounded">{pos.symbol}</span>}
                                  <span>{Number(pos.units).toLocaleString(undefined, { maximumFractionDigits: 4 })} units</span>
                                  <span>•</span>
                                  <span>Avg Cost: {formatCurrency(pos.averageCostMinor)}</span>
                                  <span>•</span>
                                  <span className="text-foreground font-medium">NAV: {formatCurrency(pos.currentPriceMinor)}</span>
                                </div>
                              </div>
                              <div className="text-left sm:text-right shrink-0">
                                <div className="font-semibold text-sm text-foreground">
                                  {formatCurrency(pos.estimatedValueMinor)}
                                </div>
                                <div className={`text-xs font-semibold ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {isPos ? '+' : ''}{formatCurrency(pos.unrealizedGainLoss)}
                                  {pos.unrealizedGainLossPct !== undefined && (
                                    <span className="ml-1 opacity-90">
                                      ({isPos ? '+' : ''}{pos.unrealizedGainLossPct.toFixed(2)}%)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'budgets' && (
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : <BudgetBarChart data={budgets} />}
            </CardContent>
          </Card>
        )}
      </div>

      <ExportConfigModal 
        isOpen={isExportOpen} 
        onClose={() => setIsExportOpen(false)} 
        workspaceId={workspaceId} 
      />
    </div>
  );
}
