'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { useCurrency } from '@/components/layout/CurrencyProvider';
import { getCurrencySymbol } from '@/lib/money';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B'];

export const CategoryPieChart = ({ data, onCategoryClick }: { data: Array<Record<string, unknown>>, onCategoryClick?: (id: string) => void }) => {
  const { baseCurrency } = useCurrency();

  if (!data || data.length === 0) {
    return <div className="text-sm text-gray-500 h-64 flex items-center justify-center">No data available</div>;
  }

  const normalizedData = data.map((d) => ({
    ...d,
    totalAmountMinor: Number(d.totalAmountMinor || 0),
  }));

  const formatCurrency = (value: unknown) => {
    if (typeof value !== 'number') return '';
    try {
      return (value / 100).toLocaleString(undefined, { style: 'currency', currency: baseCurrency });
    } catch {
      return `${getCurrencySymbol(baseCurrency)} ${(value / 100).toFixed(2)}`;
    }
  };

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={normalizedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="totalAmountMinor"
            nameKey="categoryName"
            onClick={(entry: any) => onCategoryClick && onCategoryClick(entry?.categoryId)}
            cursor="pointer"
          >
            {normalizedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={formatCurrency} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const NetWorthTrendChart = ({ data }: { data?: any }) => {
  const { baseCurrency } = useCurrency();
  const symbol = getCurrencySymbol(baseCurrency);

  if (!data || data.length === 0) {
    return <div className="text-sm text-gray-500 h-64 flex items-center justify-center">No data available</div>;
  }

  let runningSum = 0;
  const chartData = data.map((d: any) => {
    runningSum += (Number(d?.netAmountMinor || 0) / 100);
    return {
      date: d?.date || '',
      netVal: runningSum
    };
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <Line type="monotone" dataKey="netVal" name="Net Trend" stroke="#8884d8" />
          <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
          <XAxis dataKey="date" tick={{fontSize: 12}} />
          <YAxis tick={{fontSize: 12}} tickFormatter={(v) => `${symbol}${v}`} />
          <Tooltip formatter={(val: unknown) => typeof val === 'number' ? val.toLocaleString(undefined, { style: 'currency', currency: baseCurrency }) : ''} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const WealthTrendChart = NetWorthTrendChart;

export const BudgetBarChart = ({ data }: { data: Array<Record<string, unknown>> }) => {
  const { baseCurrency } = useCurrency();
  const symbol = getCurrencySymbol(baseCurrency);

  if (!data || data.length === 0) {
    return <div className="text-sm text-gray-500 h-64 flex items-center justify-center">No active budgets</div>;
  }

  const chartData = data.map(d => ({
    name: d.categoryName,
    spent: Number(d.spentMinor) / 100,
    remaining: Math.max(0, (Number(d.amountMinor) - Number(d.spentMinor)) / 100),
    total: Number(d.amountMinor) / 100
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(v) => `${symbol}${v}`} />
          <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
          <Tooltip formatter={(val: unknown) => typeof val === 'number' ? val.toLocaleString(undefined, { style: 'currency', currency: baseCurrency }) : ''} />
          <Bar dataKey="spent" stackId="a" fill="#FF8042" name="Spent" />
          <Bar dataKey="remaining" stackId="a" fill="#00C49F" name="Remaining" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
