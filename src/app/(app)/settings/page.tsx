'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TaxonomyManager } from '@/components/settings/TaxonomyManager';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

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
        
        <div className={cn("space-y-4 mt-6", activeTab === 'general' ? 'block' : 'hidden')}>
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your public profile and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className={cn("space-y-4 mt-6", activeTab === 'taxonomy' ? 'block' : 'hidden')}>
          <TaxonomyManager />
        </div>

        <div className={cn("space-y-4 mt-6", activeTab === 'security' ? 'block' : 'hidden')}>
          <Card>
            <CardHeader>
              <CardTitle>Security & 2FA</CardTitle>
              <CardDescription>Manage your account security and authentication methods.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">Coming soon.</p>
            </CardContent>
          </Card>
        </div>

        <div className={cn("space-y-4 mt-6", activeTab === 'billing' ? 'block' : 'hidden')}>
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your billing and plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">Coming soon.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

