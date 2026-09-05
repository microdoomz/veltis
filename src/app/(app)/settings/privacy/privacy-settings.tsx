"use client";

import { usePrivacy } from "@/components/layout/PrivacyProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Amount } from "@/components/ui/amount";

export function PrivacySettings() {
  const { isPrivacyModeEnabled, setPrivacyMode, temporarilyReveal, isRevealed } = usePrivacy();

  return (
    <div className="space-y-6">
      <Card className="p-6 border-border bg-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Privacy Mode</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Obscure sensitive monetary values throughout the application. 
              Useful when presenting or recording your screen.
            </p>
          </div>
          <div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isPrivacyModeEnabled}
                onChange={(e) => setPrivacyMode(e.target.checked)}
              />
              <div className="w-11 h-6 bg-muted border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </Card>

      {isPrivacyModeEnabled && (
        <Card className="p-6 border-border bg-card">
          <div className="flex flex-col space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Test Privacy Display</h2>
              <p className="text-sm text-muted-foreground mt-1">
                See how amounts appear when privacy mode is enabled. Click the amount to toggle temporary reveal.
              </p>
            </div>
            <div className="bg-muted/50 border border-border/80 p-4 rounded-xl flex items-center justify-between shadow-xs">
              <span className="font-medium text-foreground text-sm">Total Balance Preview</span>
              <Amount valueMinor={1500000n} currency="USD" className="text-base font-semibold" />
            </div>
            
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">Temporary Reveal</h3>
                <p className="text-xs text-muted-foreground">
                  Quickly reveal hidden amounts for 15 seconds across the app.
                </p>
              </div>
              <Button 
                onClick={temporarilyReveal} 
                disabled={isRevealed}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                {isRevealed ? "Amounts Revealed (15s)" : "Temporarily Reveal Amounts"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
