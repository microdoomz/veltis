'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Circle, ArrowRight, Sparkles, PlusCircle } from 'lucide-react';

interface OnboardingBannerProps {
  workspaceName?: string;
}

export function OnboardingBanner({ workspaceName }: OnboardingBannerProps) {
  return (
    <Card className="border-teal-500/30 bg-gradient-to-br from-teal-50/70 via-card to-emerald-50/40 dark:from-teal-950/30 dark:via-card dark:to-emerald-950/20 shadow-sm overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              Onboarding in Progress • 50% Complete
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Finish setting up your workspace
              </h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {workspaceName ? `"${workspaceName}" is ready.` : 'Your personal workspace is ready.'}{' '}
                Add your first liquid account (Bank, Cash Wallet, or Credit Card) to unlock authoritative Net Wealth, Available Money calculations, and transaction records.
              </p>
            </div>

            {/* Step progress pills */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Step 1: Workspace provisioned</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-1 rounded-md border border-teal-200 dark:border-teal-800/60 animate-pulse">
                <Circle className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 fill-teal-500/20" />
                <span>Step 2: Add first account & currency</span>
              </div>
            </div>
          </div>

          <div className="flex flex-row md:flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto shrink-0">
            <Link href="/onboarding" className="w-full md:w-auto">
              <Button className="w-full md:w-auto gap-2 bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
                <span>Continue Onboarding</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/accounts/new" className="w-full md:w-auto">
              <Button variant="outline" className="w-full md:w-auto gap-1.5">
                <PlusCircle className="h-4 w-4" />
                <span>Add Account</span>
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
