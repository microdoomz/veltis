"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Amount } from "@/components/ui/amount";

type Props = {
  accountId: string;
  workspaceId: string;
  calculatedBalanceMinor: bigint;
  currency: string;
};

export function ReconcileForm({ accountId, workspaceId, calculatedBalanceMinor, currency }: Props) {
  const router = useRouter();
  const [actualBalanceInput, setActualBalanceInput] = useState<string>("");
  const [createAdjustment, setCreateAdjustment] = useState(true);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert input (major units) to minor units for comparison
  const actualBalanceMinor = actualBalanceInput
    ? BigInt(Math.round(parseFloat(actualBalanceInput) * 100))
    : null;

  const differenceMinor = actualBalanceMinor !== null 
    ? actualBalanceMinor - calculatedBalanceMinor 
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actualBalanceMinor === null) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/accounts/${accountId}/reconcile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId,
          actualBalanceMinor: actualBalanceMinor.toString(),
          createAdjustment,
          note,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reconcile account");
      }

      router.push(`/accounts/${accountId}`);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Step 1: Compare Balances</h2>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-gray-50 rounded-lg border mb-6">
          <div>
            <p className="text-sm text-gray-500 font-medium">Veltis Calculated Balance</p>
            <div className="text-2xl font-bold mt-1">
              <Amount valueMinor={calculatedBalanceMinor} currency={currency} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Actual Balance (from your bank/statement)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input 
                type="number"
                step="0.01"
                required
                value={actualBalanceInput}
                onChange={(e) => setActualBalanceInput(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
          {differenceMinor !== null && differenceMinor !== 0n && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-md text-orange-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Difference Detected</p>
                <p className="text-sm mt-1">Your actual balance differs from Veltis by</p>
              </div>
              <div className="text-lg font-bold">
                <Amount valueMinor={differenceMinor} currency={currency} showSign />
              </div>
            </div>
          )}

          {differenceMinor !== null && differenceMinor === 0n && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
              <p className="font-semibold text-sm">Perfect Match</p>
              <p className="text-sm mt-1">Your actual balance matches Veltis exactly.</p>
            </div>
          )}
        </div>
      </Card>

      {differenceMinor !== null && differenceMinor !== 0n && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Step 2: Adjustments</h2>
          <div className="space-y-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input 
                type="checkbox"
                checked={createAdjustment}
                onChange={(e) => setCreateAdjustment(e.target.checked)}
                className="mt-1"
              />
              <div>
                <p className="font-medium">Create an adjustment transaction</p>
                <p className="text-sm text-gray-500">
                  This will create an explicit <code>adjustment</code> transaction to fix the difference. It will correct your balance without affecting your income/expense charts.
                </p>
              </div>
            </label>

            {createAdjustment && (
              <div className="pt-2">
                <label className="block text-sm font-medium mb-1">Adjustment Note (Optional)</label>
                <input 
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Missing bank fee"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push(`/accounts/${accountId}`)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || actualBalanceMinor === null}
        >
          {isSubmitting ? "Reconciling..." : "Complete Reconciliation"}
        </Button>
      </div>
    </form>
  );
}
