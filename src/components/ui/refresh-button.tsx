'use client';

import { RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRefresh } from './refresh-context';

interface RefreshButtonProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  label?: string;
}

export function RefreshButton({ className, size = 'sm', label }: RefreshButtonProps) {
  const { isRefreshing, triggerRefresh } = useRefresh();

  const handleRefresh = () => {
    triggerRefresh();
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    default: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isRefreshing}
      title="Refresh balances & latest data"
      aria-label="Refresh balances & latest data"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg p-1.5 text-muted-foreground transition-all duration-200',
        'hover:text-foreground hover:bg-muted/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        isRefreshing && 'opacity-80 cursor-wait',
        className
      )}
    >
      <RotateCw
        className={cn(
          iconSizes[size],
          'transition-transform duration-500',
          isRefreshing && 'animate-spin text-primary'
        )}
      />
      {label && <span className="text-xs font-medium">{label}</span>}
    </button>
  );
}
