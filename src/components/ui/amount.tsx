import * as React from "react"
import { cn } from "@/lib/utils"

interface AmountProps extends React.HTMLAttributes<HTMLSpanElement> {
  valueMinor: bigint;
  currency?: string;
  showSign?: boolean;
  colorize?: "none" | "default" | "inverted";
}

export function formatMoney(valueMinor: bigint, currency: string = "INR") {
  // For V1, assuming INR with 2 decimal places.
  // We divide by 100 to get major units.
  const major = Number(valueMinor) / 100
  
  // Format with standard Intl.NumberFormat
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major)
}

export const Amount = React.forwardRef<HTMLSpanElement, AmountProps>(
  ({ valueMinor, currency = "INR", showSign = false, colorize = "none", className, ...props }, ref) => {
    const isNegative = valueMinor < 0n;
    const isPositive = valueMinor > 0n;
    const isZero = valueMinor === 0n;

    // Use absolute value for formatting if we are showing a custom sign
    const absValueMinor = isNegative ? -valueMinor : valueMinor;
    let formatted = formatMoney(absValueMinor, currency);
    
    // Add explicit plus/minus sign if requested
    if (showSign) {
      if (isNegative) formatted = "-" + formatted;
      if (isPositive) formatted = "+" + formatted;
    } else if (isNegative) {
       // Just native negative representation (usually handles it nicely, but Intl often puts `-₹` instead of `₹-`)
       formatted = formatMoney(valueMinor, currency);
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

    return (
      <span
        ref={ref}
        className={cn(
          "font-mono tabular-nums tracking-tight",
          colorClass,
          className
        )}
        {...props}
      >
        {formatted}
      </span>
    )
  }
)
Amount.displayName = "Amount"
