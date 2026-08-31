'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ExportConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function ExportConfigModal({ isOpen, onClose, workspaceId }: ExportConfigModalProps) {
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'pdf' | 'json'>('xlsx');
  const [dateRange, setDateRange] = useState('all_time');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let startDateStr = '';
      let endDateStr = '';
      
      const now = new Date();
      if (dateRange === 'this_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startDateStr = firstDay.toISOString();
        endDateStr = now.toISOString();
      } else if (dateRange === 'last_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        startDateStr = firstDay.toISOString();
        endDateStr = lastDay.toISOString();
      } else if (dateRange === 'ytd') {
        const firstDay = new Date(now.getFullYear(), 0, 1);
        startDateStr = firstDay.toISOString();
        endDateStr = now.toISOString();
      }

      const params = new URLSearchParams({
        workspaceId,
        format
      });

      if (startDateStr) params.append('startDate', startDateStr);
      if (endDateStr) params.append('endDate', endDateStr);

      const response = await fetch(`/api/exports?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Veltis_Export_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card w-full max-w-md rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-2">Export Data</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Download your financial data for reporting or backup purposes.
        </p>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Format</label>
            <select 
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={format} 
              onChange={(e) => setFormat(e.target.value as any)}
            >
              <option value="xlsx">Excel (XLSX)</option>
              <option value="csv">CSV (Transactions Only)</option>
              <option value="pdf">PDF Report</option>
              <option value="json">Full JSON Backup</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Date Range</label>
            <select 
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all_time">All Time</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="ytd">Year to Date</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>Cancel</Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>
    </div>
  );
}
