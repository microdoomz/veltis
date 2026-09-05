import Link from 'next/link';
import { getUser } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ShieldCheck, 
  WifiOff, 
  Zap, 
  EyeOff, 
  TrendingUp, 
  FileSpreadsheet, 
  ArrowRight, 
  CheckCircle2, 
  KeyRound,
  Layers,
  Sparkles
} from 'lucide-react';

export const metadata = {
  title: 'Veltis — The Authoritative Financial Ledger for Modern Wealth',
  description: 'Double-entry precision, offline-first sync, Apple Shortcuts quick capture, and comprehensive wealth tracking with zero floating-point errors.',
};

export default async function RootPage() {
  const session = await getUser();
  if (session?.user) {
    redirect('/home');
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm">
              V
            </div>
            <span className="font-bold text-xl tracking-tight text-primary">Veltis</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#architecture" className="hover:text-foreground transition-colors">Architecture</a>
            <a href="#demo" className="hover:text-foreground transition-colors">Demo Credentials</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            Financial Integrity • Zero Floating-Point Errors
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            The Authoritative Financial Ledger for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400">
              Modern Wealth
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Double-entry ledger precision, offline-first synchronization, Apple Shortcuts quick-capture, and privacy masking. Engineered for people who take money seriously.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base shadow-md group">
                Open Your Ledger
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="h-12 px-6 text-base">
                Explore Features
              </Button>
            </a>
          </div>

          {/* Quick Demo Credentials Banner */}
          <div id="demo" className="pt-8 max-w-xl mx-auto">
            <div className="p-4 rounded-xl border border-primary/20 bg-card/60 backdrop-blur-sm shadow-sm text-left flex items-start gap-3">
              <KeyRound className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-foreground">Interactive Demo Account Ready</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Sign in immediately with pre-seeded transactions and accounts:
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs font-mono">
                  <span>Email: <strong className="text-primary">test@example.com</strong></span>
                  <span>Password: <strong className="text-primary">Password@123</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars Section */}
      <section id="features" className="py-16 md:py-24 bg-muted/30 border-y border-border/60 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-primary">Engineered with Purpose</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Veltis does not use fuzzy estimates or brittle heuristics. Every balance is mathematically derived from immutable transaction legs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 space-y-3 hover:border-primary/50 transition-all hover:shadow-md">
              <div className="p-3 bg-primary/10 text-primary w-fit rounded-lg">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg">Double-Entry Ledger</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every transaction balances debits and credits across financial account legs. BigInt minor units eliminate floating-point rounding bugs entirely.
              </p>
            </Card>

            <Card className="p-6 space-y-3 hover:border-primary/50 transition-all hover:shadow-md">
              <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 w-fit rounded-lg">
                <WifiOff className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg">Offline-First Sync</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Log expenses on airplanes or in basements. Transactions queue into local IndexedDB and sync idempotently as soon as connectivity resumes.
              </p>
            </Card>

            <Card className="p-6 space-y-3 hover:border-primary/50 transition-all hover:shadow-md">
              <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 w-fit rounded-lg">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg">Apple Shortcuts API</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Capture purchases via Siri or the iPhone Action Button in 2 seconds flat. Protected by revocable SHA-256 hashed bearer tokens.
              </p>
            </Card>

            <Card className="p-6 space-y-3 hover:border-primary/50 transition-all hover:shadow-md">
              <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-fit rounded-lg">
                <EyeOff className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg">Privacy Blur Masking</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Toggle privacy mode with one click. Financial amounts blur smoothly into dots, protecting sensitive balances in public cafes and offices.
              </p>
            </Card>

            <Card className="p-6 space-y-3 hover:border-primary/50 transition-all hover:shadow-md">
              <div className="p-3 bg-positive/10 text-positive w-fit rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg">Investments & Wealth</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Consolidate bank accounts, credit cards, digital wallets, and investment holdings with automated market price snapshots and clear disclosures.
              </p>
            </Card>

            <Card className="p-6 space-y-3 hover:border-primary/50 transition-all hover:shadow-md">
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 w-fit rounded-lg">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg">Zero Lock-In Exports</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your data belongs to you. Export clean Excel (.xlsx) workbooks, PDF reports, standard CSV files, or complete JSON database snapshots anytime.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Architecture Highlights Section */}
      <section id="architecture" className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto rounded-2xl border border-border bg-card p-8 md:p-12 space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Built on Modern Engineering Standards</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {[
              { title: 'Next.js 16', desc: 'App Router & Server Actions' },
              { title: 'Neon Postgres', desc: 'Serverless PostgreSQL' },
              { title: 'Drizzle ORM', desc: 'Type-Safe Relational Schema' },
              { title: 'Better Auth', desc: 'Multi-Factor & Sessions' },
            ].map((tech) => (
              <div key={tech.title} className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <p className="font-semibold text-sm">{tech.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tech.desc}</p>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              Ready to take control of your financial records with mathematical certainty?
            </p>
            <Link href="/login">
              <Button>Launch Veltis</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 py-8 px-4 sm:px-6 bg-card">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">Veltis</span>
            <span>• The Authoritative Financial Ledger</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Register</Link>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
