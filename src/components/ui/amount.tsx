"use client"
import * as React from "react"
import { cn } from "@/lib/utils"
import { PrivacyContext } from "@/components/layout/PrivacyProvider"
import { useCurrency } from "@/components/layout/CurrencyProvider"
import { motion, AnimatePresence } from "framer-motion"

interface AmountProps extends React.HTMLAttributes<HTMLSpanElement> {
  valueMinor: bigint;
  currency?: string;
  showSign?: boolean;
  colorize?: "none" | "default" | "inverted";
}

const currencyLocaleMap: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "de-DE",
  JPY: "ja-JP",
  CAD: "en-CA",
  AUD: "en-AU",
  SGD: "en-SG",
};

export function formatMoney(valueMinor: bigint, currency: string = "USD") {
  const major = Number(valueMinor) / 100;
  const upperCurrency = currency.toUpperCase();
  const locale = currencyLocaleMap[upperCurrency] || "en-US";
  
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: upperCurrency,
    minimumFractionDigits: upperCurrency === 'JPY' ? 0 : 2,
    maximumFractionDigits: upperCurrency === 'JPY' ? 0 : 2,
  }).format(major);
}

export const Amount = React.forwardRef<HTMLSpanElement, AmountProps>(
  ({ valueMinor, currency, showSign = false, colorize = "none", className, onClick, ...props }, ref) => {
    // Some instances might render Amount in environments without PrivacyProvider (e.g. static pages if any), 
    // but the app is fully wrapped in the provider.
    const privacyContext = React.useContext(PrivacyContext) || {
      isPrivacyModeEnabled: false,
      isRevealed: false,
      toggleReveal: () => {},
      togglePrivacyMode: () => {},
      temporarilyReveal: () => {},
      setPrivacyMode: () => {},
    };
    const { isPrivacyModeEnabled, isRevealed, toggleReveal } = privacyContext;
    const { baseCurrency } = useCurrency();
    const effectiveCurrency = currency || baseCurrency || "USD";
    const isNegative = valueMinor < 0n;
    const isPositive = valueMinor > 0n;
    const isZero = valueMinor === 0n;

    // Use absolute value for formatting if we are showing a custom sign
    const absValueMinor = isNegative ? -valueMinor : valueMinor;
    
    const isMasked = isPrivacyModeEnabled && !isRevealed;
    let formatted = "💵 ••••••";

    if (!isMasked) {
      formatted = formatMoney(absValueMinor, effectiveCurrency);
      
      // Add explicit plus/minus sign if requested
      if (showSign) {
        if (isNegative) formatted = "-" + formatted;
        if (isPositive) formatted = "+" + formatted;
      } else if (isNegative) {
         // Just native negative representation (usually handles it nicely, but Intl often puts `-₹` instead of `₹-`)
         formatted = formatMoney(valueMinor, effectiveCurrency);
      }
    }

    // Determine coloring
    let colorClass = ""
    if (colorize === "default") {
      if (isPositive) colorClass = "text-positive"
      if (isNegative) colorClass = "text-danger"
      if (isZero) colorClass = "text-muted-foreground"
    } else if (colorize === "inverted") {
      // Sometimes an expense (negative) is expected and doesn't need to be red, 
      // or income (positive) means less debt so it's good/bad depending on context.
      if (isPositive) colorClass = "text-danger"
      if (isNegative) colorClass = "text-positive"
    }

    const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
      if (isPrivacyModeEnabled && toggleReveal) {
        e.stopPropagation();
        toggleReveal();
      }
      onClick?.(e);
    };

    return (
      <span
        ref={ref}
        onClick={handleClick}
        title={
          isPrivacyModeEnabled
            ? isRevealed
              ? "Privacy mode active: click to re-hide"
              : "Privacy mode active: click to reveal balance"
            : undefined
        }
        className={cn(
          "font-mono tabular-nums tracking-tight",
          isPrivacyModeEnabled && "cursor-pointer select-none hover:opacity-80 transition-opacity",
          colorClass,
          className
        )}
        {...props}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={formatted}
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.2 }}
            className="inline-block"
          >
            {formatted}
          </motion.span>
        </AnimatePresence>
      </span>
    )
  }
)
Amount.displayName = "Amount"
