'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function ExportsPage() {
  const [format, setFormat] = useState('csv');
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // In a real app, this would trigger an API route that generates and downloads the file
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`Exporting data as ${format.toUpperCase()} for range: ${dateRange}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Data Export</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export your data</CardTitle>
          <CardDescription>
            Download your transactions, accounts, and budgets for personal backup or use in other tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Date Range</label>
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="last30">Last 30 Days</option>
              <option value="thisYear">This Year</option>
              <option value="lastYear">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Format</label>
            <select 
              value={format} 
              onChange={(e) => setFormat(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="csv">CSV (Spreadsheet)</option>
              <option value="json">JSON (Developer)</option>
              <option value="pdf">PDF (Report)</option>
            </select>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleExport} disabled={loading} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            {loading ? 'Generating Export...' : 'Download Export'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

