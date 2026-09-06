'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  TrendingDown,
  Edit3,
  Layers,
} from 'lucide-react';

export function InvestmentActions({
  workspaceId,
  accounts,
  positions,
  onUpdate,
}: {
  workspaceId: string;
  accounts: { id: string; name: string }[];
  positions: { id: string; name: string; symbol: string }[];
  onUpdate: () => void;
}) {
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleSelectAction = (action: string) => {
    setIsMenuOpen(false);
    setActiveForm(action);
  };

  const renderForm = () => {
    switch (activeForm) {
      case 'contribute':
        return (
          <TransactionForm
            type="contribution"
            workspaceId={workspaceId}
            accounts={accounts}
            onClose={() => setActiveForm(null)}
            onUpdate={onUpdate}
          />
        );
      case 'withdraw':
        return (
          <TransactionForm
            type="withdrawal"
            workspaceId={workspaceId}
            accounts={accounts}
            onClose={() => setActiveForm(null)}
            onUpdate={onUpdate}
          />
        );
      case 'buy':
        return (
          <TradeForm
            type="buy"
            workspaceId={workspaceId}
            accounts={accounts}
            positions={positions}
            onClose={() => setActiveForm(null)}
            onUpdate={onUpdate}
          />
        );
      case 'sell':
        return (
          <TradeForm
            type="sell"
            workspaceId={workspaceId}
            accounts={accounts}
            positions={positions}
            onClose={() => setActiveForm(null)}
            onUpdate={onUpdate}
          />
        );
      case 'updatePrice':
        return (
          <UpdatePriceForm
            workspaceId={workspaceId}
            positions={positions}
            onClose={() => setActiveForm(null)}
            onUpdate={onUpdate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="relative inline-block" ref={menuRef}>
        {/* Animated Plus (+) button rotating 45° to (X) */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border shadow-xs transition-all duration-200 ${
            isMenuOpen
              ? 'bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/20'
              : 'bg-card text-foreground border-border hover:bg-muted/80'
          }`}
          aria-expanded={isMenuOpen}
          title="Investment trade and cash actions"
        >
          <Plus
            className={`w-4 h-4 transition-transform duration-300 ease-in-out ${
              isMenuOpen ? 'rotate-45' : 'rotate-0'
            }`}
          />
          <span>Trade & Cash Actions</span>
        </button>

        {/* Floating Menu Popover */}
        {isMenuOpen && (
          <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-card border border-border shadow-xl py-2 z-40 animate-in fade-in zoom-in-95 origin-top-left">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
              Cash Operations
            </div>
            <button
              type="button"
              onClick={() => handleSelectAction('contribute')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors text-left"
            >
              <ArrowDownToLine className="w-4 h-4 text-emerald-500" />
              <span>Contribute Cash</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectAction('withdraw')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors text-left"
            >
              <ArrowUpFromLine className="w-4 h-4 text-rose-500" />
              <span>Withdraw Cash</span>
            </button>

            <div className="px-3 py-1.5 mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-t border-b border-border/40">
              Trading & Positions
            </div>
            <button
              type="button"
              onClick={() => handleSelectAction('buy')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors text-left"
            >
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Buy Asset / Units</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectAction('sell')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors text-left"
            >
              <TrendingDown className="w-4 h-4 text-amber-500" />
              <span>Sell Asset / Units</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectAction('updatePrice')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors text-left"
            >
              <Edit3 className="w-4 h-4 text-sky-500" />
              <span>Update Current Price</span>
            </button>
          </div>
        )}
      </div>

      {activeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 border border-border">
            {renderForm()}
          </div>
        </div>
      )}
    </>
  );
}

function TransactionForm({
  type,
  workspaceId,
  accounts,
  onClose,
  onUpdate,
}: {
  type: string;
  workspaceId: string;
  accounts: { id: string; name: string }[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [bankAccountId, setBankAccountId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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
      <h3 className="text-lg font-semibold text-foreground capitalize">{type} Cash</h3>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Investment Account</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          {type === 'contribution' ? 'Source Bank Account ID' : 'Destination Bank Account ID'}
        </label>
        <input
          type="text"
          value={bankAccountId}
          onChange={(e) => setBankAccountId(e.target.value)}
          placeholder="Bank account identifier"
          required
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex justify-end gap-2.5 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl shadow-xs hover:opacity-90"
        >
          Save
        </button>
      </div>
    </form>
  );
}

function TradeForm({
  type,
  workspaceId,
  accounts,
  positions,
  onClose,
  onUpdate,
}: {
  type: string;
  workspaceId: string;
  accounts: { id: string; name: string }[];
  positions: { id: string; name: string; symbol: string }[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [positionId, setPositionId] = useState(positions[0]?.id || '');
  const [units, setUnits] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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
      <h3 className="text-lg font-semibold text-foreground capitalize">{type} Asset</h3>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Investment Account</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Asset (Position)</label>
        {positions.length > 0 ? (
          <select
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.symbol})
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-amber-600">No positions found. Please create an investment account first.</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Units</label>
          <input
            type="number"
            step="0.0001"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Price per unit</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2.5 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl shadow-xs hover:opacity-90"
        >
          Save Trade
        </button>
      </div>
    </form>
  );
}

function UpdatePriceForm({
  workspaceId,
  positions,
  onClose,
  onUpdate,
}: {
  workspaceId: string;
  positions: { id: string; name: string; symbol: string }[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [positionId, setPositionId] = useState(positions[0]?.id || '');
  const [price, setPrice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/investments/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        positionId,
        manualPriceMinor: Math.round(Number(price) * 100),
        manualCurrency: 'USD',
      }),
    });
    onUpdate();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Update Manual Price</h3>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Asset (Position)</label>
        <select
          value={positionId}
          onChange={(e) => setPositionId(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
        >
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.symbol})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Current Price</label>
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex justify-end gap-2.5 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl shadow-xs hover:opacity-90"
        >
          Save Price
        </button>
      </div>
    </form>
  );
}
