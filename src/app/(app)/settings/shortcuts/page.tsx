import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { getActiveShortcutTokens } from '@/lib/services/shortcut';
import { getAccounts } from '@/lib/services/account';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { deleteShortcutTokenAction } from '@/app/actions/shortcut';
import { CreateShortcutForm } from './create-form';
import { AccountShortcutsTable } from '@/components/shortcuts/AccountShortcutsTable';
import { Zap, Download, ExternalLink, ShieldCheck, CheckCircle2, WalletCards } from 'lucide-react';

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
                <form action={deleteShortcutTokenAction.bind(null, authContext.workspaceId)}>
                  <input type="hidden" name="tokenId" value={token.id} />
                  <Button variant="outline" size="sm" type="submit" className="text-destructive hover:bg-destructive/10">
                    Revoke
                  </Button>
                </form>
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
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
              1
            </span>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Generate and copy your token</p>
              <p className="text-muted-foreground text-xs">
                Create a new token in the section above and copy the secret token string starting with <code>vsh_</code>.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
              2
            </span>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Create a new Shortcut</p>
              <p className="text-muted-foreground text-xs">
                Open the <strong>Shortcuts</strong> app on iOS and tap <strong>+</strong> in the top right corner.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
              3
            </span>
            <div className="space-y-2 w-full">
              <p className="font-semibold text-foreground">Add the &quot;Get Contents of URL&quot; Action</p>
              <p className="text-muted-foreground text-xs">
                In the bottom search bar, search for <strong>Get Contents of URL</strong> and tap to add it.
              </p>
              <div className="p-3 bg-muted/60 rounded-lg font-mono text-xs text-foreground break-all">
                URL: <strong>https://veltismoney.vercel.app/api/shortcuts/expense</strong>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
              4
            </span>
            <div className="space-y-3 w-full">
              <p className="font-semibold text-foreground">Configure Method & Headers</p>
              <p className="text-muted-foreground text-xs">
                Tap the arrow or dropdown next to the URL to expand configuration options:
              </p>
              <div className="space-y-2 pl-2 border-l-2 border-primary/40">
                <p className="text-xs">
                  • Set <strong>Method</strong>: Select <strong>POST</strong>
                </p>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">• Under <strong>Headers</strong>, tap <strong>Add new header</strong> twice to add:</p>
                  <div className="bg-muted/60 p-3 rounded-lg space-y-2 text-xs font-mono">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 border-b border-border/50 pb-1.5">
                      <div><span className="text-muted-foreground">Header 1 Key:</span> <strong>Authorization</strong></div>
                      <div><span className="text-muted-foreground">Text field:</span> <strong>Bearer YOUR_TOKEN</strong> (or paste <code>vsh_...</code>)</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-0.5">
                      <div><span className="text-muted-foreground">Header 2 Key:</span> <strong>Content-Type</strong></div>
                      <div><span className="text-muted-foreground">Text field:</span> <strong>application/json</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
              5
            </span>
            <div className="space-y-3 w-full">
              <p className="font-semibold text-foreground">Configure Request Body (JSON fields)</p>
              <p className="text-muted-foreground text-xs">
                Set <strong>Request Body</strong> to <strong>JSON</strong>. Tap <strong>Add new field</strong> for the fields below:
              </p>
              <div className="bg-muted/60 p-3 rounded-lg space-y-3 text-xs">
                {/* Field 1 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px]">Type: Number</span>
                    <strong className="font-mono text-foreground">amount</strong>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    In <strong>Key</strong> enter <code>amount</code>. In the <strong>Number</strong> field, enter an amount (or tap and select <em>Ask Each Time</em> / <em>Shortcut Input</em>).
                  </p>
                </div>

                {/* Field 2 */}
                <div className="space-y-1 border-t border-border/50 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">Type: Text</span>
                    <strong className="font-mono text-foreground">description</strong>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    In <strong>Key</strong> enter <code>description</code>. In the <strong>Text</strong> field, enter what the expense is for (or tap and select <em>Ask Each Time</em>).
                  </p>
                </div>

                {/* Field 3 */}
                <div className="space-y-1 border-t border-border/50 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px]">Type: Text (Optional)</span>
                    <strong className="font-mono text-foreground">accountId</strong>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    In <strong>Key</strong> enter <code>accountId</code> (or <code>account</code>). In the <strong>Text</strong> field, enter your Account ID or account name from the table above (or select <em>Ask Each Time</em> / <em>Choose from Menu</em>). If omitted, Veltis uses your default active bank account.
                  </p>
                </div>

                {/* Field 4 */}
                <div className="space-y-1 border-t border-border/50 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px]">Type: Text (Optional)</span>
                    <strong className="font-mono text-foreground">idempotencyKey</strong>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    In <strong>Key</strong> enter <code>idempotencyKey</code>. In the <strong>Text</strong> field, tap and select <em>Current Date</em> (or leave empty to let Veltis auto-generate).
                  </p>
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
