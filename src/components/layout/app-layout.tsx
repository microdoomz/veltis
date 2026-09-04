"use client"

import Link from "next/link"
import { useState } from "react"
import { Home, ListOrdered, WalletCards, Plus, MoreHorizontal, Target, Repeat, Upload, Zap, Menu, LogOut, ChevronLeft, Settings, Download } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { SyncStatus } from "@/components/sync/SyncStatus"
import { QuickAddFab } from "@/components/layout/quick-add-fab"
import { useRouter } from "next/navigation"

const navItems = [
  { href: '/home', label: 'Dashboard', icon: Home },
  { href: '/accounts', label: 'Accounts', icon: WalletCards },
  { href: '/transactions', label: 'Transactions', icon: ListOrdered },
  { href: '/analytics', label: 'Analytics', icon: Target },
  { href: '/budgets', label: 'Budgets', icon: Target },
  { href: '/recurring', label: 'Recurring', icon: Repeat },
  { href: '/imports', label: 'Imports', icon: Upload },
  { href: '/settings/shortcuts', label: 'Shortcuts', icon: Zap },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/exports', label: 'Exports', icon: Download },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-4 h-16 flex items-center justify-between">
          {!isCollapsed && <h1 className="text-xl font-bold text-primary tracking-tight px-2">Veltis</h1>}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors mx-auto"
            aria-label="Toggle Sidebar"
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
        
        {!isCollapsed && (
          <div className="px-6 pb-2">
            <SyncStatus />
          </div>
        )}
        
        <nav className="flex-1 px-4 space-y-2 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} isCollapsed={isCollapsed} />
          ))}
        </nav>

        <div className="p-4 border-t border-border flex flex-col gap-2">
          <Link href="/transactions/new" className={`flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 ${isCollapsed ? 'px-0' : 'px-4'}`}>
            <Plus className="h-5 w-5" />
            {!isCollapsed && <span>New Transaction</span>}
          </Link>
          
          <button onClick={handleLogout} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive justify-center md:justify-start ${isCollapsed ? 'justify-center' : ''}`}>
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto pb-16 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card sticky top-0 z-10">
          <h1 className="text-lg font-bold text-primary tracking-tight">Veltis</h1>
          <SyncStatus />
        </header>
        
        <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50 px-2 pb-safe">
        <MobileNavLink href="/home" icon={Home} label="Home" />
        <MobileNavLink href="/transactions" icon={ListOrdered} label="Txns" />
        
        <QuickAddFab />
        
        <MobileNavLink href="/accounts" icon={WalletCards} label="Accounts" />
        <MobileNavLink href="/more" icon={MoreHorizontal} label="More" />
      </nav>
    </div>
  )
}

function NavLink({ href, icon: Icon, label, isCollapsed }: { href: string; icon: React.ElementType; label: string; isCollapsed: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
      title={isCollapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!isCollapsed && <span>{label}</span>}
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
