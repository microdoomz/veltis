import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { getActiveShortcutTokens } from '@/lib/services/shortcut';
import { getAccounts } from '@/lib/services/account';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateShortcutForm } from './create-form';
import { AccountShortcutsTable } from '@/components/shortcuts/AccountShortcutsTable';
import { RevokeTokenButton } from '@/components/shortcuts/RevokeTokenButton';
import {
  Zap,
  Download,
  ShieldCheck,
  CheckCircle2,
  WalletCards,
  AlertTriangle,
  KeyRound,
  ArrowRight,
  ShieldAlert,
  Smartphone,
  HelpCircle,
  FileCode2,
  Check,
  Copy,
} from 'lucide-react';

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
    <div className="max-w-4xl mx-auto py-8 space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Zap className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Apple Shortcuts Integration</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Log expenses and income in seconds directly from your iPhone, Siri, or Action Button without opening the app.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 1. DOWNLOAD PRE-CONFIGURED SHORTCUT (APPEARS FIRST)                       */}
      {/* ========================================================================= */}
      <Card className="p-6 border-primary/30 bg-primary/5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-primary text-primary-foreground">
                <Smartphone className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Download Pre-configured Veltis Shortcut
              </h2>
              <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Recommended
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl">
              Download the ready-made Veltis Shortcut and install it on your iPhone. This is the easiest and recommended option. You do not need to build the shortcut yourself.
            </p>
          </div>

          <a
            href="/api/shortcuts/download"
            download="Veltis.shortcut"
            className="flex-shrink-0"
          >
            <Button size="lg" className="flex items-center gap-2 shadow font-semibold px-6">
              <Download className="w-5 h-5" />
              Download Veltis.shortcut
            </Button>
          </a>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 2. CONFIGURE THE DOWNLOADED SHORTCUT                                      */}
      {/* ========================================================================= */}
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Configure the Downloaded Shortcut
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            The downloaded shortcut is already built with the complete Veltis API flow. You only need to follow these 3 quick steps to install and prepare it:
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h3 className="font-semibold text-sm">Download</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tap <strong>&quot;Download Veltis.shortcut&quot;</strong> above using Safari on your iPhone, iPad, or Mac.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                2
              </span>
              <h3 className="font-semibold text-sm">Open &amp; Install</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Open the downloaded <code>.shortcut</code> file. When iOS prompts you, tap <strong>&quot;Add Shortcut&quot;</strong>. It will appear in your Apple Shortcuts library.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                3
              </span>
              <h3 className="font-semibold text-sm">Open for Editing</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Open the <strong>Shortcuts</strong> app, locate <strong>&quot;Veltis&quot;</strong>, and tap the <strong>three dots (&bull;&bull;&bull;)</strong> button to customize your token and accounts.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground/90 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
          <span>
            <strong>Everything is pre-wired:</strong> The HTTP requests, prompts, and variables are fully built. You only need to plug in your <strong>Access Token</strong> (Section 3) and your <strong>Account IDs</strong> (Section 4).
          </span>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 3. GENERATE YOUR VELTIS ACCESS TOKEN                                      */}
      {/* ========================================================================= */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Generate Your Veltis Access Token
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Your access token safely authenticates requests sent by your iPhone shortcut to your Veltis workspace.
            </p>
          </div>
        </div>

        {/* Token Generator Form */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
          <h3 className="font-semibold text-sm">Generate a New Shortcut Token</h3>
          <CreateShortcutForm workspaceId={authContext.workspaceId} />
        </div>

        {/* Active Tokens List */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Your Active Access Tokens</h3>
          {tokens.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
              No active shortcut tokens found. Click above to generate your first token.
            </div>
          ) : (
            <div className="space-y-2">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="p-3.5 rounded-xl bg-card border border-border flex justify-between items-center"
                >
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Where Token Goes In Shortcut */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-4">
          <h3 className="font-semibold text-sm text-foreground">Where to Paste Your Access Token in Shortcuts:</h3>

          <ol className="space-y-2 text-xs text-muted-foreground list-decimal pl-4">
            <li>Generate a new token above and copy the secret token string starting with <code>vsh_</code>.</li>
            <li>Open the Veltis shortcut in Apple Shortcuts and scroll to the <strong>&quot;Get Contents of URL&quot;</strong> actions.</li>
            <li>Look for the <strong>Authorization</strong> header under <strong>Headers</strong>.</li>
            <li>
              Find the placeholder value:
              <div className="mt-1 font-mono text-[11px] p-2 rounded bg-background border border-border text-foreground">
                Bearer ENTER_YOUR_TOKEN (Create this from the Veltis Site and place it after the &#39;Bearer&#39;)
              </div>
            </li>
            <li>
              Replace the placeholder token with your copied token. The final value must look like:
              <div className="mt-1 font-mono text-[11px] p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                Bearer vsh_xxxxxxxxxxxxxxxxxxxx
              </div>
            </li>
          </ol>

          <div className="grid sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 rounded-lg bg-background border border-border/70 space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Original Placeholder</span>
              <p className="font-mono text-[11px]">Header: <strong>Authorization</strong></p>
              <p className="font-mono text-[11px] text-muted-foreground">Value: <strong>Bearer YOUR_TOKEN</strong></p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-emerald-500/30 space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Becomes</span>
              <p className="font-mono text-[11px]">Header: <strong>Authorization</strong></p>
              <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Value: <strong>Bearer vsh_...</strong></p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            <strong>Important Rules:</strong> Do not remove the word <code>Bearer </code> (with the space after it). Do not change the header name <code>Authorization</code>. The <code>Content-Type</code> header must remain <code>application/json</code>. You only need one token for all your accounts.
          </p>

          {/* Security Notice */}
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Important Security Warning: Your Access Token is Secret</p>
              <p className="text-[11px] text-rose-700/90 dark:text-rose-300/90 leading-relaxed">
                Do not share your token or post screenshots of it. If you believe your token has been exposed, revoke it immediately above and generate a new one.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 4. ADD / CONFIGURE YOUR ACCOUNTS                                          */}
      {/* ========================================================================= */}
      <Card className="p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <WalletCards className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Add &amp; Configure Your Accounts
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Connect the shortcut&#39;s account menu to your actual bank, cash, or credit card accounts in Veltis.
          </p>
        </div>

        {/* Account Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Your Veltis Accounts &amp; Account IDs</h3>
            <span className="text-[11px] text-muted-foreground">Tap any ID to copy</span>
          </div>
          <AccountShortcutsTable accounts={spendingAccounts} />
        </div>

        {/* Explanation of Placeholders */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 text-xs">
          <h3 className="font-semibold text-sm text-foreground">Understanding Account Placeholders</h3>
          <p className="text-muted-foreground leading-relaxed">
            The downloaded shortcut contains 5 example account placeholders in the <strong>&quot;Select the Account&quot;</strong> menu. You should rename each placeholder to match your real account and paste the corresponding <strong>Account ID</strong>:
          </p>

          <div className="grid sm:grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-background border border-border/70 space-y-0.5">
              <div className="text-muted-foreground">Placeholder in Shortcut:</div>
              <strong className="text-foreground">Account 1</strong> &rarr; <span className="text-primary font-bold">HDFC Bank</span>
              <div className="text-[10px] text-muted-foreground">Text box: Paste HDFC Account UUID</div>
            </div>

            <div className="p-2.5 rounded-lg bg-background border border-border/70 space-y-0.5">
              <div className="text-muted-foreground">Placeholder in Shortcut:</div>
              <strong className="text-foreground">Account 2</strong> &rarr; <span className="text-primary font-bold">ICICI Bank</span>
              <div className="text-[10px] text-muted-foreground">Text box: Paste ICICI Account UUID</div>
            </div>

            <div className="p-2.5 rounded-lg bg-background border border-border/70 space-y-0.5">
              <div className="text-muted-foreground">Placeholder in Shortcut:</div>
              <strong className="text-foreground">Account 3</strong> &rarr; <span className="text-primary font-bold">Cash Wallet</span>
              <div className="text-[10px] text-muted-foreground">Text box: Paste Cash Account UUID</div>
            </div>

            <div className="p-2.5 rounded-lg bg-background border border-border/70 space-y-0.5">
              <div className="text-muted-foreground">Placeholder in Shortcut:</div>
              <strong className="text-foreground">Account 4</strong> &rarr; <span className="text-primary font-bold">SBI Account</span>
              <div className="text-[10px] text-muted-foreground">Text box: Paste SBI Account UUID</div>
            </div>

            <div className="p-2.5 rounded-lg bg-background border border-border/70 space-y-0.5 sm:col-span-2">
              <div className="text-muted-foreground">Placeholder in Shortcut:</div>
              <strong className="text-foreground">Account 5</strong> &rarr; <span className="text-primary font-bold">Credit Card</span>
              <div className="text-[10px] text-muted-foreground">Text box: Paste Credit Card Account UUID</div>
            </div>
          </div>
        </div>

        {/* Adding & Removing Accounts */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-foreground">Adding More or Removing Accounts</h3>
            <p className="text-xs text-muted-foreground">
              You are <strong>not limited to 5 accounts</strong>. You can have fewer or more than 5 accounts.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            {/* Removing Accounts */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
              <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <span>✕</span> How to Remove an Account
              </h4>
              <ol className="space-y-1.5 list-decimal pl-4 text-muted-foreground">
                <li>Open the Veltis shortcut in Apple Shortcuts.</li>
                <li>Find the <strong>&quot;Select the Account&quot;</strong> menu action.</li>
                <li>Tap the red minus icon on the account option you don&#39;t want.</li>
                <li>Delete the corresponding <strong>Text</strong> action and <strong>Set Variable</strong> action under that section.</li>
              </ol>
            </div>

            {/* Adding Accounts */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
              <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary">
                <span>+</span> How to Add an Account
              </h4>
              <ol className="space-y-1.5 list-decimal pl-4 text-muted-foreground">
                <li>Tap <strong>&quot;Add new item&quot;</strong> inside the <strong>&quot;Select the Account&quot;</strong> menu.</li>
                <li>Type your actual account name (e.g. &quot;Axis Bank&quot;).</li>
                <li>Under that new menu section, add a <strong>Text</strong> action and paste its Veltis Account ID.</li>
                <li>Add a <strong>Set Variable</strong> action setting <code>SelectedAccountId</code> to that Text.</li>
              </ol>
            </div>
          </div>

          {/* Visual Tree Diagram */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
            <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Visual Structure of the Account Menu:
            </p>
            <pre className="p-3 bg-background border border-border/80 rounded-lg text-xs font-mono text-foreground overflow-x-auto leading-relaxed">
{`Choose from Menu ("Select the Account")
│
├── Account 1: HDFC Bank
│   └── Text action: "4c9f1234-5678-..." (HDFC Account ID)
│
├── Account 2: ICICI Bank
│   └── Text action: "8a1b2345-6789-..." (ICICI Account ID)
│
├── Account 3: Cash
│   └── Text action: "3d4e5678-9012-..." (Cash Account ID)
│
├── Account 4: SBI
│   └── Text action: "9f0a1234-5678-..." (SBI Account ID)
│
├── Account 5: Credit Card
│   └── Text action: "1c2d3456-7890-..." (Credit Card Account ID)
│
└── [Optional] Add another account
    └── Account 6: My New Account
        └── Text action: "your-account-uuid-here"`}
            </pre>
            <p className="text-[11px] text-muted-foreground">
              <strong>Key Rule:</strong> Every account option in the menu must contain a <strong>Text</strong> action holding that account&#39;s exact Veltis Account ID. When you tap the account on your iPhone, the shortcut automatically forwards that Account ID to Veltis.
            </p>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 5. TEST THE SHORTCUT & THE TWO API REQUESTS                               */}
      {/* ========================================================================= */}
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Test the Shortcut
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Once your token and accounts are set, test running the shortcut on your device.
          </p>
        </div>

        {/* Visual Diagram */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
          <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
            Complete Shortcut Execution Flow:
          </p>
          <pre className="p-3 bg-background border border-border/80 rounded-lg text-xs font-mono text-foreground overflow-x-auto leading-relaxed">
{`Run Veltis Shortcut (Tap icon or ask Siri)
        │
        ▼
What do you want to record? ──► [ Expense ] or [ Income ]
        │
        ▼
Select Account ───────────────► Choose from your configured accounts
        │
        ▼
Enter Amount ─────────────────► e.g. 250
        │
        ▼
Enter Description ────────────► e.g. "Groceries" or "Salary"
        │
        ▼
Get Contents of URL ──────────► Calls Veltis API with your Token & Account ID
        │
        ├── Expense ──► POST /api/shortcuts/expense
        │
        └── Income  ──► POST /api/shortcuts/income
        │
        ▼
Veltis instantly records transaction in ledger!`}
          </pre>
        </div>

        {/* Two API Endpoints Explanation */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-foreground">The Two Endpoints Configured in the Shortcut:</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-[11px]">
                  1. Expense Request
                </span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                  POST
                </span>
              </div>
              <p className="font-mono text-[11px] bg-background/80 p-2 rounded border border-border/60 break-all text-foreground">
                https://veltismoney.vercel.app/api/shortcuts/expense
              </p>
              <p className="text-muted-foreground text-[11px]">
                Triggered when you select <strong>&quot;Expense&quot;</strong>. Deducts the amount from your chosen account balance.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[11px]">
                  2. Income Request
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                  POST
                </span>
              </div>
              <p className="font-mono text-[11px] bg-background/80 p-2 rounded border border-border/60 break-all text-foreground">
                https://veltismoney.vercel.app/api/shortcuts/income
              </p>
              <p className="text-muted-foreground text-[11px]">
                Triggered when you select <strong>&quot;Income&quot;</strong>. Credits the amount to your chosen account balance.
              </p>
            </div>
          </div>
        </div>

        {/* Token + Account Flow Summary Visual */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
          <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
            How Tokens &amp; Accounts Connect to Veltis:
          </p>
          <pre className="p-3 bg-background border border-border/80 rounded-lg text-xs font-mono text-foreground overflow-x-auto leading-relaxed">
{`Veltis Platform
 │
 ├── Generate Access Token ──► vsh_xxxxxxxxxxxx
 │
 └── Accounts Table ────────► HDFC Bank    ──► 4c9f1234...
                              ICICI Bank   ──► 8a1b2345...
                              Cash Wallet  ──► 3d4e5678...
                                    ↓
                           Apple Shortcuts App
                                    │
                                    ├── Authorization: Bearer vsh_xxxxxxxxxxxx
                                    └── Selected Account ID: 4c9f1234...
                                                │
                                                ▼
                                    Veltis Secure Ledger API`}
          </pre>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 6. OR — CREATE THE SAME SHORTCUT MANUALLY                                 */}
      {/* ========================================================================= */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-4 font-bold text-muted-foreground tracking-widest">
            OR — CREATE THE VELTIS SHORTCUT YOURSELF
          </span>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileCode2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Manual Shortcut Creation
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            If you prefer to build the shortcut manually from scratch, you can recreate the exact same shortcut structure below.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 7. MANUAL SHORTCUT PREREQUISITES                                         */}
        {/* ========================================================================= */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2.5">
          <h3 className="font-semibold text-sm text-foreground">Manual Shortcut Prerequisites</h3>
          <p className="text-xs text-muted-foreground">Make sure you have these ready before building:</p>
          <ul className="grid sm:grid-cols-2 gap-2 text-xs text-foreground/90">
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>An iPhone or iPad with the <strong>Shortcuts</strong> app</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>An active <strong>Veltis account</strong></span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>At least one <strong>Account ID</strong> from the table above</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>A generated <strong>Veltis Access Token</strong> (starts with <code>vsh_</code>)</span>
            </li>
            <li className="flex items-center gap-2 sm:col-span-2">
              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>The API endpoints: <code>/api/shortcuts/expense</code> and <code>/api/shortcuts/income</code></span>
            </li>
          </ul>
        </div>

        {/* ========================================================================= */}
        {/* 8. MANUAL SHORTCUT — STEP-BY-STEP INSTRUCTIONS                           */}
        {/* ========================================================================= */}
        <div className="space-y-6">
          <h3 className="font-semibold text-base text-foreground">
            Manual Shortcut — Step-by-Step Instructions
          </h3>

          {/* Step 1: Create New Shortcut */}
          <div className="p-4 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-primary">STEP 1 — Create a New Shortcut</span>
              <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">Apple Shortcuts</span>
            </div>
            <p className="text-xs"><strong>WHAT TO TAP:</strong> Open the <strong>Shortcuts</strong> app on iOS and tap the <strong>+</strong> icon in the top-right corner.</p>
            <p className="text-xs"><strong>THEN:</strong> Tap the shortcut title at the top and rename it to <strong>Veltis</strong>.</p>
            <p className="text-xs text-muted-foreground"><strong>WHY:</strong> This creates a clean new shortcut ready to configure.</p>
          </div>

          {/* Step 2: Choose Record Type Menu */}
          <div className="p-4 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-primary">STEP 2 — Add &quot;What do you want to record?&quot; Menu</span>
              <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">Choose from Menu</span>
            </div>
            <p className="text-xs"><strong>WHAT TO TAP:</strong> Tap <strong>Add Action</strong>, search for <strong>&quot;Choose from Menu&quot;</strong>, and add it.</p>
            <p className="text-xs"><strong>CONFIGURATION:</strong> Set Prompt to <em>&quot;What do you want to record?&quot;</em>. Change the menu options to: <strong>Expense</strong> and <strong>Income</strong>.</p>
            <p className="text-xs text-muted-foreground"><strong>WHY:</strong> Allows choosing whether you are logging an expense or an income whenever you run the shortcut.</p>
          </div>

          {/* Step 3: Account Selection Menu & Text IDs */}
          <div className="p-4 rounded-xl border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-primary">STEP 3 — Add Account Selection Menu &amp; Account IDs</span>
              <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">Choose from Menu + Text</span>
            </div>
            <p className="text-xs"><strong>WHAT TO TAP:</strong> Under the <strong>Expense</strong> section, add another <strong>&quot;Choose from Menu&quot;</strong> action.</p>
            <p className="text-xs"><strong>CONFIGURATION:</strong> Set Prompt to <em>&quot;Select the Account&quot;</em>. Add your accounts (e.g. HDFC Bank, ICICI Bank, Cash, Credit Card).</p>
            <p className="text-xs"><strong>THEN:</strong> Under each account name in the menu, add a <strong>&quot;Text&quot;</strong> action containing that account&#39;s exact Veltis <strong>Account ID</strong> from the table above.</p>
            <p className="text-xs text-muted-foreground"><strong>WHY:</strong> The menu result will output the selected account&#39;s UUID text so Veltis knows which account to update.</p>
          </div>

          {/* Step 4: Ask for Amount */}
          <div className="p-4 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-primary">STEP 4 — Ask for Amount</span>
              <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">Ask for Input</span>
            </div>
            <p className="text-xs"><strong>WHAT TO TAP:</strong> Search for <strong>&quot;Ask for Input&quot;</strong> and place it right after the Account menu.</p>
            <p className="text-xs"><strong>CONFIGURATION:</strong> Change input type from Text to <strong>Number</strong>. Set Prompt to <em>&quot;Amount:&quot;</em>.</p>
            <p className="text-xs text-muted-foreground"><strong>WHY:</strong> Prompts for the transaction amount (e.g. 50 or 2500) using a numeric keypad.</p>
          </div>

          {/* Step 5: Ask for Description */}
          <div className="p-4 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-primary">STEP 5 — Ask for Description</span>
              <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">Ask for Input</span>
            </div>
            <p className="text-xs"><strong>WHAT TO TAP:</strong> Add another <strong>&quot;Ask for Input&quot;</strong> action.</p>
            <p className="text-xs"><strong>CONFIGURATION:</strong> Keep input type as <strong>Text</strong>. Set Prompt to <em>&quot;Description:&quot;</em>.</p>
            <p className="text-xs text-muted-foreground"><strong>WHY:</strong> Prompts for what the money was spent on or received for (e.g. &quot;Coffee&quot;, &quot;Client Payment&quot;).</p>
          </div>

          {/* Step 6: Get Contents of URL */}
          <div className="p-4 rounded-xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-primary">STEP 6 — Send Request to Veltis</span>
              <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">Get Contents of URL</span>
            </div>
            <p className="text-xs"><strong>WHAT TO TAP:</strong> Search for <strong>&quot;Get Contents of URL&quot;</strong> and tap <strong>Show More</strong>.</p>
            
            <div className="space-y-2 font-mono text-xs bg-muted/40 p-3 rounded-lg border border-border/80">
              <p><strong>URL:</strong> https://veltismoney.vercel.app/api/shortcuts/expense</p>
              <p><strong>Method:</strong> POST</p>
              <div className="border-t border-border/60 pt-2 space-y-1">
                <p className="font-sans font-semibold text-foreground">Headers (Add 2 headers):</p>
                <p>&bull; <code>Authorization</code>: <strong>Bearer vsh_YOUR_TOKEN</strong></p>
                <p>&bull; <code>Content-Type</code>: <strong>application/json</strong></p>
              </div>
              <div className="border-t border-border/60 pt-2 space-y-1.5 font-sans">
                <p className="font-semibold text-foreground">Request Body (Select JSON, add 3 fields):</p>
                <div className="font-mono text-[11px] space-y-1 bg-background p-2.5 rounded border border-border/60">
                  <p>&bull; Key: <code>amount</code> &bull; Type: <strong>Number</strong> &bull; Value: Tap and select <strong>Provided Input</strong> from the Amount step</p>
                  <p>&bull; Key: <code>description</code> &bull; Type: <strong>Text</strong> &bull; Value: Tap and select <strong>Provided Input</strong> from the Description step</p>
                  <p>&bull; Key: <code>accountId</code> &bull; Type: <strong>Text</strong> &bull; Value: Tap and select <strong>Menu Result</strong> from the Account menu</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground"><strong>WHY:</strong> Securely transmits the transaction with your authorization token to the Veltis double-entry accounting engine.</p>
          </div>

          {/* Step 7: Repeat for Income */}
          <div className="p-4 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-primary">STEP 7 — Repeat Inside the Income Branch</span>
              <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">Income URL</span>
            </div>
            <p className="text-xs">
              Under the <strong>Income</strong> branch of your top menu, repeat the same action flow, but change the URL to:
            </p>
            <p className="font-mono text-xs bg-muted/60 p-2 rounded border border-border/60 break-all text-emerald-600 dark:text-emerald-400 font-semibold">
              https://veltismoney.vercel.app/api/shortcuts/income
            </p>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 9. TROUBLESHOOTING                                                        */}
      {/* ========================================================================= */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Troubleshooting Common Mistakes
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          {/* 401 Unauthorized */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <span className="text-rose-500">✕</span> Problem: &quot;401 Unauthorized&quot;
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Check that your <code>Authorization</code> header exists, begins with <code>Bearer </code> (with a space), and contains your active token starting with <code>vsh_</code> without any extra quotes or line breaks.
            </p>
          </div>

          {/* 404 Not Found */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <span className="text-rose-500">✕</span> Problem: &quot;404 Not Found&quot;
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Verify the exact URL in the &quot;Get Contents of URL&quot; action:
              <br />
              Expense: <code>https://veltismoney.vercel.app/api/shortcuts/expense</code>
              <br />
              Income: <code>https://veltismoney.vercel.app/api/shortcuts/income</code>
            </p>
          </div>

          {/* Account Not Found */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <span className="text-rose-500">✕</span> Problem: &quot;Account not found&quot;
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Verify that the Account ID in the Text action under that account branch matches the exact UUID in the Veltis accounts table above. Make sure the JSON field type in Shortcuts is <strong>Text</strong> (never Dictionary).
            </p>
          </div>

          {/* Shortcut Runs but Nothing Recorded */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <span className="text-rose-500">✕</span> Problem: Shortcut runs but transaction is not recorded
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Ensure:
              1. Method is set to <strong>POST</strong>.
              2. <code>Content-Type</code> is <code>application/json</code>.
              3. The JSON body contains <code>amount</code> (Number from Ask for Number), <code>description</code> (Text from Ask for Text), and <code>accountId</code> (Text from Menu Result).
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
