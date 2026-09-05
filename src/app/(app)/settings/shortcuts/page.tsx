import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { getActiveShortcutTokens } from '@/lib/services/shortcut';
import { getAccounts } from '@/lib/services/account';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateShortcutForm } from './create-form';
import { AccountShortcutsTable } from '@/components/shortcuts/AccountShortcutsTable';
import { RevokeTokenButton } from '@/components/shortcuts/RevokeTokenButton';
import { Zap, Download, ExternalLink, ShieldCheck, CheckCircle2, WalletCards, ListFilter } from 'lucide-react';

export default async function ShortcutsPage() {
  const authContext = await requireWorkspaceAccess();
  const [tokens, allAccounts] = await Promise.all([
    getActiveShortcutTokens(authContext.workspaceId),
    getAccounts(authContext.workspaceId),
  ]);

  const spendingAccounts = allAccounts.filter(
    (a) => a.accountType !== 'investment' && a.status === 'active'
  );

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Zap className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Apple Shortcuts Integration</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Log expenses in seconds directly from your iPhone, Siri, or Action Button without opening the app.
        </p>
      </div>

      {/* Token Generator Form */}
      <CreateShortcutForm workspaceId={authContext.workspaceId} />

      {/* Active Tokens List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Active Access Tokens</h2>
        {tokens.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No active shortcut tokens. Generate one above to connect your iPhone.
          </Card>
        ) : (
          <div className="space-y-3">
            {tokens.map((token) => (
              <Card key={token.id} className="p-4 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{token.name}</p>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Active
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(token.createdAt).toLocaleDateString()}
                    {token.lastUsedAt && ` • Last used: ${new Date(token.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <RevokeTokenButton
                  workspaceId={authContext.workspaceId}
                  tokenId={token.id}
                />
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Available Spending Accounts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WalletCards className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Your Accounts (For Shortcuts)</h2>
          </div>
          <span className="text-xs text-muted-foreground">Excludes investments</span>
        </div>
        <Card className="p-4">
          <AccountShortcutsTable accounts={spendingAccounts} />
        </Card>
      </div>

      {/* Detailed Setup Instructions */}
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">Step-by-Step iPhone Setup Instructions</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Follow these exact steps in Apple&#39;s Shortcuts app on your iPhone or iPad.
          </p>
        </div>

        <div className="space-y-6 text-sm">
          {/* Important Callout / Pitfalls */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <h3 className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2 text-xs uppercase tracking-wider">
              <span>⚠️</span> Two Critical Shortcuts Rules to Prevent Errors
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 text-xs text-foreground/90">
              <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 space-y-1">
                <p className="font-bold text-foreground">1. Is <code>accountId</code> a Dictionary?</p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  <strong className="text-emerald-600 dark:text-emerald-400">NO. It is Text.</strong> In the JSON body field type picker, select <strong>Text</strong> (never Dictionary). The Account ID is a text UUID string (e.g. <code>4c9f...</code>).
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 space-y-1">
                <p className="font-bold text-foreground">2. Where does &quot;Choose from Menu&quot; go?</p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  It must go at the <strong className="text-primary">very top (Action 1)</strong>, BEFORE &quot;Get Contents of URL&quot;. Shortcuts executes strictly top-to-bottom.
                </p>
              </div>
            </div>
          </div>

          {/* Setup Method Selector */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                1
              </span>
              <div>
                <p className="font-semibold text-foreground">Generate &amp; Copy your Access Token</p>
                <p className="text-muted-foreground text-xs">
                  Create a new token above and copy the secret token string starting with <code>vsh_</code>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                2
              </span>
              <div>
                <p className="font-semibold text-foreground">Open iOS Shortcuts &amp; Create a New Shortcut</p>
                <p className="text-muted-foreground text-xs">
                  Open the <strong>Shortcuts</strong> app on iOS and tap <strong>+</strong> in the top-right corner.
                </p>
              </div>
            </div>

            {/* Visual Action Flow Box */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Shortcut Action Sequence (Choose Method A or B):
              </p>

              <div className="space-y-3">
                {/* Method A */}
                <div className="p-3 rounded-lg bg-background border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-primary">Method A: Simple (Fixed Primary Account)</span>
                    <span className="text-[10px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">Recommended &bull; 60 Seconds</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    If you always charge expenses to one account (e.g. your primary bank or cash), simply add:
                  </p>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="p-2 rounded bg-muted/60 border border-border/40">
                      <strong>Action 1:</strong> Ask for Number with prompt <em>&quot;How much did you spend?&quot;</em>
                    </div>
                    <div className="p-2 rounded bg-muted/60 border border-border/40">
                      <strong>Action 2:</strong> Ask for Text with prompt <em>&quot;What was it for?&quot;</em>
                    </div>
                    <div className="p-2 rounded bg-muted/60 border border-border/40">
                      <strong>Action 3:</strong> Get Contents of URL (see Step 3 below, and paste your Account ID directly into <code>accountId</code>)
                    </div>
                  </div>
                </div>

                {/* Method B */}
                <div className="p-3 rounded-lg bg-background border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">Method B: Interactive Multi-Account Menu</span>
                    <span className="text-[10px] bg-muted text-muted-foreground font-medium px-2 py-0.5 rounded-full">Prompts you to pick an account</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    To choose which account to charge on every purchase:
                  </p>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="p-2 rounded bg-muted/60 border border-border/40">
                      <strong>Action 1:</strong> Choose from Menu with prompt <em>&quot;Select Account&quot;</em>
                      <div className="pl-3 pt-1 text-[10px] text-muted-foreground space-y-1 font-sans">
                        <div>&bull; Option: <strong>&quot;Bank Account&quot;</strong> &rarr; Add <strong>Text</strong> action below it: paste Bank Account UUID</div>
                        <div>&bull; Option: <strong>&quot;Cash Wallet&quot;</strong> &rarr; Add <strong>Text</strong> action below it: paste Cash UUID</div>
                      </div>
                    </div>
                    <div className="p-2 rounded bg-muted/60 border border-border/40">
                      <strong>Action 2:</strong> Ask for Number with prompt <em>&quot;Amount?&quot;</em>
                    </div>
                    <div className="p-2 rounded bg-muted/60 border border-border/40">
                      <strong>Action 3:</strong> Ask for Text with prompt <em>&quot;Description?&quot;</em>
                    </div>
                    <div className="p-2 rounded bg-muted/60 border border-border/40">
                      <strong>Action 4:</strong> Get Contents of URL (set <code>accountId</code> to <strong>Menu Result</strong> variable)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: URL & Method */}
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                3
              </span>
              <div className="space-y-2 w-full">
                <p className="font-semibold text-foreground">Add &quot;Get Contents of URL&quot; Action</p>
                <div className="p-3 bg-muted/60 rounded-lg font-mono text-xs text-foreground break-all">
                  URL: <strong>https://veltismoney.vercel.app/api/shortcuts/expense</strong>
                </div>
                <div className="p-3 bg-muted/60 rounded-lg space-y-1 text-xs">
                  <p><strong>Method:</strong> POST</p>
                </div>
              </div>
            </div>

            {/* Step 4: Headers */}
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                4
              </span>
              <div className="space-y-2 w-full">
                <p className="font-semibold text-foreground">Add Request Headers</p>
                <p className="text-muted-foreground text-xs">
                  Under <strong>Headers</strong>, tap <strong>Add new header</strong> twice:
                </p>
                <div className="bg-muted/60 p-3 rounded-lg space-y-2 text-xs font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 border-b border-border/50 pb-1.5">
                    <div><span className="text-muted-foreground font-sans">Header 1 Key:</span> <strong>Authorization</strong></div>
                    <div><span className="text-muted-foreground font-sans">Value:</span> <strong>Bearer YOUR_TOKEN</strong></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-0.5">
                    <div><span className="text-muted-foreground font-sans">Header 2 Key:</span> <strong>Content-Type</strong></div>
                    <div><span className="text-muted-foreground font-sans">Value:</span> <strong>application/json</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5: JSON Body */}
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                5
              </span>
              <div className="space-y-3 w-full">
                <p className="font-semibold text-foreground">Configure Request Body (JSON fields)</p>
                <p className="text-muted-foreground text-xs">
                  Set <strong>Request Body</strong> to <strong>JSON</strong>. Tap <strong>Add new field</strong> for these 3 fields:
                </p>
                <div className="bg-muted/60 p-3 rounded-lg space-y-3 text-xs">
                  {/* Field 1: amount */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px]">Type: Number</span>
                      <strong className="font-mono text-foreground">amount</strong>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Key: <code>amount</code> &bull; Value: Tap and select your <em>Provided Input</em> from the Number prompt.
                    </p>
                  </div>

                  {/* Field 2: description */}
                  <div className="space-y-1 border-t border-border/50 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">Type: Text</span>
                      <strong className="font-mono text-foreground">description</strong>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Key: <code>description</code> &bull; Value: Tap and select your <em>Provided Input</em> from the Text prompt.
                    </p>
                  </div>

                  {/* Field 3: accountId */}
                  <div className="space-y-1.5 border-t border-border/50 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px]">Type: Text (Never Dictionary!)</span>
                      <strong className="font-mono text-foreground">accountId</strong>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      Key: <code>accountId</code> &bull; Value: Select <strong>Text</strong> type. In Method A, paste your Account ID directly from the table above. In Method B, tap and select <strong>Menu Result</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OR DIVIDER */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 font-bold text-muted-foreground tracking-widest">
              OR
            </span>
          </div>
        </div>

        {/* Direct Shortcut Download Section */}
        <div className="p-5 border border-dashed border-border rounded-xl bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h3 className="font-semibold text-sm">Download Pre-configured Shortcut</h3>
              <span className="text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-md">
              Download our ready-made iOS Shortcut file. Once downloaded, open it, locate the <strong>Authorization</strong> header, and paste your generated token into the text field.
            </p>
          </div>

          <Button 
            disabled 
            variant="outline" 
            className="flex-shrink-0 flex items-center gap-2 opacity-60 cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Download Shortcut (.shortcut)
          </Button>
        </div>
      </Card>
    </div>
  );
}
