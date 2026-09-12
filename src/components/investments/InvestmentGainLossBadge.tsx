"use client"

import React, { useState } from "react"
import { Amount } from "@/components/ui/amount"
import { TrendingUp, TrendingDown } from "lucide-react"

interface InvestmentGainLossBadgeProps {
  gainLossMinor: bigint;
  gainLossPct: number;
  currency?: string;
  className?: string;
}

export function InvestmentGainLossBadge({
  gainLossMinor,
  gainLossPct,
  currency,
  className = "",
}: InvestmentGainLossBadgeProps) {
  const [showAmount, setShowAmount] = useState(false);

  const isPositive = gainLossMinor > 0n || gainLossPct > 0.001;
  const isNegative = gainLossMinor < 0n || gainLossPct < -0.001;

  const badgeColorClass = isPositive
    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
    : isNegative
    ? "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20"
    : "text-muted-foreground bg-muted/60 border-border/60 hover:bg-muted";

  const formattedPct = `${isPositive ? "+" : ""}${gainLossPct.toFixed(2)}%`;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowAmount((prev) => !prev);
      }}
      title="Click to toggle between percentage and amount of gain/loss"
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md border transition-all cursor-pointer select-none active:scale-95 ${badgeColorClass} ${className}`}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3 shrink-0" />
      ) : isNegative ? (
        <TrendingDown className="w-3 h-3 shrink-0" />
      ) : null}

      {showAmount ? (
        <Amount
          valueMinor={gainLossMinor}
          currency={currency}
          showSign={true}
          colorize="none"
          className="font-semibold text-[11px]"
        />
      ) : (
        <span>{formattedPct}</span>
      )}
    </button>
  );
}
