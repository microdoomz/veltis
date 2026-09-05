"use client"

import React from "react"
import { Eye, EyeOff } from "lucide-react"
import { usePrivacy } from "@/components/layout/PrivacyProvider"
import { cn } from "@/lib/utils"

interface PrivacyToggleProps {
  compact?: boolean;
  className?: string;
}

export function PrivacyToggle({ compact = false, className }: PrivacyToggleProps) {
  const { isPrivacyModeEnabled, togglePrivacyMode, isRevealed } = usePrivacy();

  return (
    <button
      type="button"
      onClick={togglePrivacyMode}
      title={
        isPrivacyModeEnabled
          ? isRevealed
            ? "Privacy Mode: Active (Temporarily Revealed). Click to disable."
            : "Privacy Mode: Active (Hidden). Click to disable."
          : "Privacy Mode: Inactive. Click to hide balances."
      }
      aria-label="Toggle Privacy Mode"
      className={cn(
        "relative flex items-center justify-center rounded-lg transition-colors",
        compact ? "p-2" : "p-2 gap-1.5 text-xs font-medium",
        isPrivacyModeEnabled
          ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
    >
      {isPrivacyModeEnabled ? (
        <EyeOff className="h-4 w-4 flex-shrink-0 animate-in fade-in" />
      ) : (
        <Eye className="h-4 w-4 flex-shrink-0" />
      )}
      {!compact && (
        <span className="hidden sm:inline">
          {isPrivacyModeEnabled ? (isRevealed ? "Revealed" : "Privacy") : "Privacy"}
        </span>
      )}
      {isPrivacyModeEnabled && !isRevealed && (
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
      )}
    </button>
  );
}
