'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TaxonomyManager } from '@/components/settings/TaxonomyManager';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { PrivacySettings } from '@/app/(app)/settings/privacy/privacy-settings';
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection';
import { cn } from '@/lib/utils';
import { CheckCircle2, ShieldCheck, Sparkles, LogOut, Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth/client';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/login');
          router.refresh();
        },
        onError: () => {
          setIsLoggingOut(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Settings</h1>
      </div>

      <div className="w-full">
        <div className="flex items-center p-1 bg-muted rounded-lg w-full max-w-[600px]">
          {['general', 'taxonomy', 'security', 'billing'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        
        {/* General / Profile Tab */}
        <div className={cn("space-y-6 mt-6", activeTab === 'general' ? 'block' : 'hidden')}>
          <ProfileSettings />
          <PrivacySettings />
          
          {/* Account Session & Logout */}
          <Card className="border-red-500/20 bg-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <LogOut className="h-5 w-5 text-red-500" /> Account Session
              </CardTitle>
              <CardDescription>
                Sign out of your active session on this device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                <span>Log Out of Veltis</span>
              </button>
            </CardContent>
          </Card>

          <DeleteAccountSection />
        </div>
        
        {/* Taxonomy Management Tab */}
        <div className={cn("space-y-4 mt-6", activeTab === 'taxonomy' ? 'block' : 'hidden')}>
          <TaxonomyManager />
        </div>

        {/* Security & Authentication Tab */}
        <div className={cn("space-y-4 mt-6", activeTab === 'security' ? 'block' : 'hidden')}>
          <SecuritySettings />
        </div>

        {/* Billing / Plan Tab */}
        <div className={cn("space-y-4 mt-6", activeTab === 'billing' ? 'block' : 'hidden')}>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" /> Veltis Personal Plan
                  </CardTitle>
                  <CardDescription>Your current subscription tier and system entitlements.</CardDescription>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/25 self-start sm:self-auto">
                  <ShieldCheck className="h-3.5 w-3.5" /> Active Plan
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  'Strict Double-Entry Transaction Ledger',
                  'Unlimited Multi-Currency Accounts & Wallets',
                  'Offline-First IndexedDB Synchronization',
                  'Receivables & Liabilities Tracking',
                  'Market Valuation Snapshots for Investments',
                  'Direct CSV, XLSX, PDF, & JSON Database Backups',
                  'Apple Shortcuts Dedicated Bearer Token API',
                  'WebAuthn Passkey & Two-Factor Authentication',
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Zero Third-Party Scraping Guarantee</p>
                <p>
                  Veltis operates on a review-first, private financial ledger architecture. We never sell your data or connect to third-party bank scrapers without your explicit command.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <LogOut className="h-5 w-5 text-red-500" /> Log Out
              </h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to log out of your account?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutModal(false);
                  await handleLogout();
                }}
                disabled={isLoggingOut}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isLoggingOut && <Loader2 className="h-4 w-4 animate-spin" />}
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
