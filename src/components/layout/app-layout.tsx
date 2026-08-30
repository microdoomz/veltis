import Link from "next/link"
import { Home, ListOrdered, WalletCards, PieChart, Plus, MoreHorizontal } from "lucide-react"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card">
        <div className="p-6 h-16 flex items-center">
          <h1 className="text-xl font-bold text-primary tracking-tight">Veltis</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 py-4">
          <NavLink href="/home" icon={Home} label="Home" />
          <NavLink href="/transactions" icon={ListOrdered} label="Transactions" />
          <NavLink href="/accounts" icon={WalletCards} label="Accounts" />
          <NavLink href="/analytics" icon={PieChart} label="Analytics" />
        </nav>

        <div className="p-4 border-t border-border">
          <button className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            <Plus className="h-5 w-5" />
            <span>New Transaction</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto pb-16 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card sticky top-0 z-10">
          <h1 className="text-lg font-bold text-primary tracking-tight">Veltis</h1>
        </header>
        
        <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50 px-2 pb-safe">
        <MobileNavLink href="/home" icon={Home} label="Home" />
        <MobileNavLink href="/transactions" icon={ListOrdered} label="Txns" />
        
        <div className="relative -top-5">
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform">
            <Plus className="h-6 w-6" />
          </button>
        </div>
        
        <MobileNavLink href="/accounts" icon={WalletCards} label="Accounts" />
        <MobileNavLink href="/more" icon={MoreHorizontal} label="More" />
      </nav>
    </div>
  )
}

function NavLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  )
}

function MobileNavLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center w-16 text-muted-foreground hover:text-primary transition-colors"
    >
      <Icon className="h-6 w-6 mb-1" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  )
}
