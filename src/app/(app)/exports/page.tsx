'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText, Database, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ExportsPage() {
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'pdf' | 'json'>('xlsx');
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let startDateStr = '';
      let endDateStr = '';
      const now = new Date();

      if (dateRange === 'last30') {
        const past = new Date();
        past.setDate(past.getDate() - 30);
        startDateStr = past.toISOString();
        endDateStr = now.toISOString();
      } else if (dateRange === 'this_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startDateStr = firstDay.toISOString();
        endDateStr = now.toISOString();
      } else if (dateRange === 'last_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        startDateStr = firstDay.toISOString();
        endDateStr = lastDay.toISOString();
      } else if (dateRange === 'thisYear') {
        const firstDay = new Date(now.getFullYear(), 0, 1);
        startDateStr = firstDay.toISOString();
        endDateStr = now.toISOString();
      } else if (dateRange === 'lastYear') {
        const firstDay = new Date(now.getFullYear() - 1, 0, 1);
        const lastDay = new Date(now.getFullYear() - 1, 11, 31);
        startDateStr = firstDay.toISOString();
        endDateStr = lastDay.toISOString();
      }

      const params = new URLSearchParams({ format });
      if (startDateStr) params.append('startDate', startDateStr);
      if (endDateStr) params.append('endDate', endDateStr);

      const response = await fetch(`/api/exports?${params.toString()}`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Export request failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Veltis_Export_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`Export generated and downloaded successfully as .${format}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Data Export</h1>
          <p className="text-sm text-muted-foreground">Download your authoritative ledger data for backup or reporting.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Configuration</CardTitle>
          <CardDescription>
            Choose your preferred export format and time filter. Files are generated directly from your verified ledger.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/15 border border-red-500/40 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl flex items-center gap-3 shadow-xs animate-in fade-in duration-200">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-positive/10 border border-positive/20 text-positive text-sm rounded-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'xlsx', label: 'Excel', ext: '.xlsx', icon: FileSpreadsheet },
                { id: 'csv', label: 'CSV', ext: '.csv', icon: FileSpreadsheet },
                { id: 'pdf', label: 'PDF Report', ext: '.pdf', icon: FileText },
                { id: 'json', label: 'JSON Backup', ext: '.json', icon: Database },
              ].map((f) => {
                const Icon = f.icon;
                const isSelected = format === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id as typeof format)}
                    className={`p-3 rounded-lg border text-center flex flex-col items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary text-primary'
                        : 'border-border hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium text-foreground">{f.label}</span>
                    <span className="text-[10px] text-muted-foreground">{f.ext}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Time</option>
              <option value="last30">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="thisYear">This Year (YTD)</option>
              <option value="lastYear">Last Year</option>
            </select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            {format === 'json' ? 'Includes accounts, transactions, and categories.' : 'Includes double-entry transaction legs and account balances.'}
          </p>
          <Button onClick={handleExport} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            {loading ? 'Generating...' : 'Download Export'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
