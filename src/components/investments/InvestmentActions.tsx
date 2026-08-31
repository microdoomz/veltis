'use client';

import React, { useState } from 'react';
import { Plus, Minus, ArrowDownToLine, ArrowUpFromLine, Edit3 } from 'lucide-react';
// In a real app we would separate these forms, but for V1 we can keep them simple here.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function InvestmentActions({ workspaceId, accounts, positions, onUpdate }: any) {
  const [activeForm, setActiveForm] = useState<string | null>(null);

  const renderForm = () => {
    switch (activeForm) {
      case 'contribute': return <TransactionForm type="contribution" workspaceId={workspaceId} accounts={accounts} onClose={() => setActiveForm(null)} onUpdate={onUpdate} />;
      case 'withdraw': return <TransactionForm type="withdrawal" workspaceId={workspaceId} accounts={accounts} onClose={() => setActiveForm(null)} onUpdate={onUpdate} />;
      case 'buy': return <TradeForm type="buy" workspaceId={workspaceId} accounts={accounts} positions={positions} onClose={() => setActiveForm(null)} onUpdate={onUpdate} />;
      case 'sell': return <TradeForm type="sell" workspaceId={workspaceId} accounts={accounts} positions={positions} onClose={() => setActiveForm(null)} onUpdate={onUpdate} />;
      case 'updatePrice': return <UpdatePriceForm workspaceId={workspaceId} positions={positions} onClose={() => setActiveForm(null)} onUpdate={onUpdate} />;
      default: return null;
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setActiveForm('contribute')} className="flex items-center px-4 py-2 bg-slate-900 text-white dark:bg-teal-500 dark:text-slate-900 text-sm font-medium rounded-lg hover:opacity-90">
          <ArrowDownToLine className="w-4 h-4 mr-2" /> Contribute Cash
        </button>
        <button onClick={() => setActiveForm('withdraw')} className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
          <ArrowUpFromLine className="w-4 h-4 mr-2" /> Withdraw Cash
        </button>
        <button onClick={() => setActiveForm('buy')} className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
          <Plus className="w-4 h-4 mr-2" /> Buy Asset
        </button>
        <button onClick={() => setActiveForm('sell')} className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
          <Minus className="w-4 h-4 mr-2" /> Sell Asset
        </button>
        <button onClick={() => setActiveForm('updatePrice')} className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
          <Edit3 className="w-4 h-4 mr-2" /> Update Price
        </button>
      </div>

      {activeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
            {renderForm()}
          </div>
        </div>
      )}
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TransactionForm({ type, workspaceId, accounts, onClose, onUpdate }: any) {
  // Simplified for V1:
  // In a real app we'd fetch all user's bank accounts to select as source/destination.
  // Here we assume the user types the UUID of their bank account or we just have a dummy text input.
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [bankAccountId, setBankAccountId] = useState(''); // UUID
  
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await fetch('/api/investments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        type,
        investmentAccountId: accountId,
        sourceAccountId: type === 'contribution' ? bankAccountId : undefined,
        destinationAccountId: type === 'withdrawal' ? bankAccountId : undefined,
        amountMinor: Math.round(Number(amount) * 100),
        currency: 'USD',
        transactionDate: new Date().toISOString().split('T')[0],
      }),
    });
    onUpdate();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white capitalize">{type}</h3>
      <div>
        <label className="block text-sm font-medium mb-1">Investment Account</label>
        <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
          {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{type === 'contribution' ? 'Source Bank Account ID' : 'Destination Bank Account ID'}</label>
        <input type="text" value={bankAccountId} onChange={e => setBankAccountId(e.target.value)} placeholder="UUID of bank account" required className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Amount</label>
        <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium bg-teal-500 text-slate-900 rounded-lg">Save</button>
      </div>
    </form>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TradeForm({ type, workspaceId, accounts, positions, onClose, onUpdate }: any) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [positionId, setPositionId] = useState(positions[0]?.id || '');
  const [units, setUnits] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await fetch('/api/investments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        type,
        investmentAccountId: accountId,
        positionId,
        units,
        priceMinor: Math.round(Number(price) * 100),
        currency: 'USD',
        transactionDate: new Date().toISOString().split('T')[0],
      }),
    });
    onUpdate();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white capitalize">{type} Asset</h3>
      <div>
        <label className="block text-sm font-medium mb-1">Investment Account</label>
        <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
          {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Asset (Position)</label>
        {positions.length > 0 ? (
          <select value={positionId} onChange={e => setPositionId(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
            {positions.map((p: { id: string; name: string; symbol: string }) => <option key={p.id} value={p.id}>{p.name} ({p.symbol})</option>)}
          </select>
        ) : (
          <p className="text-sm text-amber-600">No positions found. Please create a position in the database first.</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Units</label>
          <input type="number" step="0.0001" value={units} onChange={e => setUnits(e.target.value)} required className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Price per unit</label>
          <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium bg-teal-500 text-slate-900 rounded-lg">Save Trade</button>
      </div>
    </form>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function UpdatePriceForm({ workspaceId, positions, onClose, onUpdate }: any) {
  const [positionId, setPositionId] = useState(positions[0]?.id || '');
  const [price, setPrice] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await fetch('/api/investments/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        positionId,
        manualPriceMinor: Math.round(Number(price) * 100),
        manualCurrency: 'USD'
      }),
    });
    onUpdate();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Update Manual Price</h3>
      <div>
        <label className="block text-sm font-medium mb-1">Asset (Position)</label>
        <select value={positionId} onChange={e => setPositionId(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
          {positions.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.symbol})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Current Price</label>
        <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium bg-teal-500 text-slate-900 rounded-lg">Save Price</button>
      </div>
    </form>
  );
}
