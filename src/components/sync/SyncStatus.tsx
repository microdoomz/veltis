"use client";

import { useSync } from "./SyncProvider";
import { useEffect, useState } from "react";
import { getPendingTransactions, getTransactionsByStatus } from "@/lib/sync/db";
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

export function SyncStatus() {
  const { isOnline, isSyncing, triggerSync } = useSync();
  const [pendingCount, setPendingCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Poll the indexedDB for counts to keep the UI updated. 
    // In a production app, we might use broadcast channels or context state to push these updates,
    // but a lightweight poll is sufficient for this offline queue.
    const checkCounts = async () => {
      try {
        const pending = await getPendingTransactions();
        const errors = await getTransactionsByStatus('error');
        
        const currentPending = pending.length;
        
        setPendingCount(currentPending);
        setErrorCount(errors.length);
        
        // Show success flash if pending drops to 0 after syncing
        if (currentPending === 0 && isOnline && pendingCount > 0) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }
      } catch {
        // ignore errors if idb not ready
      }
    };

    const interval = setInterval(checkCounts, 1000);
    checkCounts();

    return () => clearInterval(interval);
  }, [isOnline, pendingCount]);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
        <CloudOff className="h-3.5 w-3.5" />
        <span>Offline {pendingCount > 0 && `(${pendingCount} pending)`}</span>
      </div>
    );
  }

  if (errorCount > 0) {
    return (
      <button 
        onClick={triggerSync}
        className="flex items-center gap-1.5 text-xs font-medium text-red-500 bg-red-500/10 px-2 py-1 rounded-full hover:bg-red-500/20 transition-colors cursor-pointer"
        title="Click to retry syncing"
      >
        <AlertCircle className="h-3.5 w-3.5" />
        <span>{errorCount} error{errorCount !== 1 ? 's' : ''} (Retry)</span>
      </button>
    );
  }

  if (isSyncing || pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>Syncing {pendingCount > 0 && `(${pendingCount})`}</span>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full animate-in fade-in zoom-in duration-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Synced</span>
      </div>
    );
  }

  // Default state: online, everything synced, nothing pending
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/50 px-2 py-1 rounded-full">
      <Cloud className="h-3.5 w-3.5" />
    </div>
  );
}
