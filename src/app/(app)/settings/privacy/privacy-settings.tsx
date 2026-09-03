"use client";

import { usePrivacy } from "@/components/layout/PrivacyProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Amount } from "@/components/ui/amount";

export function PrivacySettings() {
  const { isPrivacyModeEnabled, setPrivacyMode, temporarilyReveal, isRevealed } = usePrivacy();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Privacy Mode</h2>
            <p className="text-sm text-gray-500 mt-1">
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </Card>

      {isPrivacyModeEnabled && (
        <Card className="p-6">
          <div className="flex flex-col space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Test Privacy Display</h2>
              <p className="text-sm text-gray-500 mt-1">
                See how amounts appear when privacy mode is enabled.
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md flex items-center justify-between border">
              <span className="font-medium">Total Balance</span>
              <Amount valueMinor={1500000n} currency="USD" />
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-2">Temporary Reveal</h3>
              <p className="text-sm text-gray-500 mb-4">
                You can temporarily reveal amounts across the app. In a future update, this will require biometric authentication.
              </p>
              <Button 
                onClick={temporarilyReveal} 
                disabled={isRevealed}
                variant="outline"
              >
                {isRevealed ? "Amounts Revealed (Auto-hides in 30s)" : "Temporarily Reveal Amounts"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
