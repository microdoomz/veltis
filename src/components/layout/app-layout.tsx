"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { Home, ListOrdered, WalletCards, Plus, Target, Repeat, Upload, Zap, Menu, LogOut, ChevronLeft, Settings, Download, TrendingUp, ArrowDownLeft, ArrowUpRight, LineChart, PiggyBank, Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { SyncStatus } from "@/components/sync/SyncStatus"
import { QuickAddFab } from "@/components/layout/quick-add-fab"
import { useRouter, usePathname } from "next/navigation"
import { PrivacyToggle } from "@/components/layout/PrivacyToggle"
import { cn } from "@/lib/utils"

function isPwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function MoneyBagIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2a2 2 0 0 1 2 2c0 .35-.1.67-.26.95L15 6h-6l1.26-1.05A2 2 0 0 1 12 2z" />
      <path d="M6 9h12c1.5 0 3 1.5 3 4 0 5-3.5 9-9 9s-9-4-9-9c0-2.5 1.5-4 3-4z" />
      <path d="M12 12v6" />
      <path d="M10 13.5a1.5 1.5 0 0 1 2-1.5h1a1.5 1.5 0 0 1 0 3h-2a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 0 2-1.5" />
    </svg>
  );
}

const navItems = [
  { href: '/home', label: 'Dashboard', icon: Home },
  { href: '/accounts', label: 'Accounts', icon: WalletCards },
  { href: '/transactions', label: 'Transactions', icon: ListOrdered },
  { href: '/investments', label: 'Investments', icon: TrendingUp },
  { href: '/receivables', label: 'Receivables', icon: ArrowDownLeft },
  { href: '/liabilities', label: 'Liabilities', icon: ArrowUpRight },
  { href: '/analytics', label: 'Analytics', icon: LineChart },
  { href: '/budgets', label: 'Budgets', icon: MoneyBagIcon },
  { href: '/recurring', label: 'Recurring', icon: Repeat },
  { href: '/imports', label: 'Imports', icon: Download },
  { href: '/exports', label: 'Exports', icon: Upload },
  { href: '/shortcuts', label: 'Shortcuts', icon: Zap },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const lastLeftSwipeTimeRef = useRef(0);
  const isTrackingEdgeOpenRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Proactively prefetch all primary application routes for instantaneous navigation
    navItems.forEach((item) => {
      router.prefetch?.(item.href);
    });
    router.prefetch?.('/transactions/new');
    router.prefetch?.('/accounts/new');
    router.prefetch?.('/settings/privacy');
    router.prefetch?.('/shortcuts');
  }, [router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Apply pwa-mode class to document root in standalone PWA mode
  useEffect(() => {
    if (isPwa()) {
      document.documentElement.classList.add('pwa-mode');
    }
  }, []);

  // PWA-Only: Prevent browser history back traversal when swiping from the left
  useEffect(() => {
    if (!isPwa()) return;

    const pushGuard = () => {
      try {
        if (!window.history.state?.pwaGuard) {
          window.history.pushState({ pwaGuard: true }, '', window.location.href);
        }
      } catch {
        // ignore
      }
    };

    pushGuard();

    const handlePopState = () => {
      const now = Date.now();
      // If a left edge swipe is occurring or occurred in the last 1500ms, block back navigation in PWA
      if (now - lastLeftSwipeTimeRef.current < 1500 || isTrackingEdgeOpenRef.current) {
        pushGuard();
        setMobileMenuOpen(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname]);

  // Lock body scroll and support Escape key when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  // Swipe from left edge to open sidebar on mobile phones, and swipe left to close
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let isTrackingEdgeOpen = false;
    let isTrackingSwipeClose = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || window.innerWidth >= 768) return;

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;

      if (!mobileMenuOpen) {
        // Touch starts only in extreme left edge zone (up to 24px)
        if (startX <= 24) {
          isTrackingEdgeOpen = true;
          isTrackingEdgeOpenRef.current = true;
          lastLeftSwipeTimeRef.current = Date.now();
        } else {
          isTrackingEdgeOpen = false;
          isTrackingEdgeOpenRef.current = false;
        }
      } else {
        // When sidebar is open, swipe left to close
        isTrackingSwipeClose = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1 || window.innerWidth >= 768) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      // Swiping right from extreme left edge to open sidebar
      if (isTrackingEdgeOpen && !mobileMenuOpen) {
        lastLeftSwipeTimeRef.current = Date.now();
        // Only preventDefault on clear, intentional horizontal swipe
        if (deltaX > 20 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }

        if (deltaX > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
          setMobileMenuOpen(true);
          isTrackingEdgeOpen = false;
          isTrackingEdgeOpenRef.current = false;
        }
      }

      // Swiping left to close sidebar
      if (isTrackingSwipeClose && mobileMenuOpen) {
        if (deltaX < -20 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }

        if (deltaX < -35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
          setMobileMenuOpen(false);
          isTrackingSwipeClose = false;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1 && window.innerWidth < 768) {
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        if (isTrackingEdgeOpen && !mobileMenuOpen) {
          if (deltaX > 25 && Math.abs(deltaX) > Math.abs(deltaY) * 0.8) {
            setMobileMenuOpen(true);
          }
        }

        if (isTrackingSwipeClose && mobileMenuOpen) {
          if (deltaX < -25 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
            setMobileMenuOpen(false);
          }
        }
      }

      isTrackingEdgeOpen = false;
      isTrackingEdgeOpenRef.current = false;
      isTrackingSwipeClose = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    // MUST be passive: false so e.preventDefault() can intercept and stop the browser's back navigation
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [mobileMenuOpen]);

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
    <div className="flex h-screen w-full bg-background overflow-hidden overscroll-none">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-4 h-16 flex items-center justify-between">
          {!isCollapsed && <h1 className="text-xl font-bold text-primary tracking-tight px-2">Veltis</h1>}
          <div className="flex items-center gap-1 mx-auto">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors mx-auto"
              aria-label="Toggle Sidebar"
            >
              <Menu className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-90 opacity-0 absolute'}`} />
              <ChevronLeft className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? '-rotate-90 opacity-0 absolute' : 'rotate-0'}`} />
            </button>
          </div>
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
          <Link prefetch={true} href="/transactions/new" className={`flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 ${isCollapsed ? 'px-0' : 'px-4'}`}>
            <Plus className="h-5 w-5" />
            {!isCollapsed && <span>New</span>}
          </Link>
          
          <button 
            onClick={() => setShowLogoutConfirm(true)} 
            disabled={isLoggingOut}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors justify-center md:justify-start ${isCollapsed ? 'justify-center' : ''}`}
            title="Log out"
          >
            {isLoggingOut ? (
              <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-red-500" />
            ) : (
              <LogOut className="h-5 w-5 flex-shrink-0 text-red-500" />
            )}
            {!isCollapsed && <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
      )}
      
      {/* Mobile Sidebar Drawer */}
      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-lg transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="p-4 h-14 flex items-center justify-between border-b border-border">
          <h1 className="text-xl font-bold text-primary tracking-tight px-2 flex-1">Veltis</h1>
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-muted-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-2 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/home' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary font-semibold border-l-2 border-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-primary fill-primary/20" : "")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <button 
            onClick={() => {
              setMobileMenuOpen(false);
              setShowLogoutConfirm(true);
            }} 
            disabled={isLoggingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            {isLoggingOut ? (
              <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-red-500" />
            ) : (
              <LogOut className="h-5 w-5 flex-shrink-0 text-red-500" />
            )}
            <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto overflow-x-hidden no-scrollbar-desktop md:[scrollbar-width:none] md:[-ms-overflow-style:none] md:[&::-webkit-scrollbar]:hidden pb-16 md:pb-0">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-end h-12 px-8 border-b border-border/40 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <PrivacyToggle />
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-bold text-primary tracking-tight">Veltis</h1>
          </div>
          <div className="flex items-center gap-2">
            <PrivacyToggle compact />
            <SyncStatus />
          </div>
        </header>
        
        <div className="flex-1 p-3.5 sm:p-4 md:p-8 max-w-5xl mx-auto w-full min-w-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-30 px-2 pb-safe">
        <MobileNavLink href="/home" icon={Home} label="Home" />
        <MobileNavLink href="/transactions" icon={ListOrdered} label="Txns" />
        
        <QuickAddFab />
        
        <MobileNavLink href="/accounts" icon={WalletCards} label="Accounts" />
        <MobileNavLink href="/analytics" icon={LineChart} label="Analytics" />
      </nav>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Log Out</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to log out of your account?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutConfirm(false);
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
  )
}

function NavLink({ href, icon: Icon, label, isCollapsed }: { href: string; icon: React.ElementType; label: string; isCollapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/home' && pathname?.startsWith(href + '/'));

  return (
    <Link
      href={href}
      prefetch={true}
      className={cn(
        "flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors",
        isCollapsed ? "justify-center px-0" : "px-3",
        isActive
          ? "bg-primary/15 text-primary font-semibold border-l-2 border-primary shadow-2xs"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      title={isCollapsed ? label : undefined}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0 transition-transform", isActive ? "text-primary fill-primary/20 scale-105" : "")} />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  )
}

function MobileNavLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/home' && pathname?.startsWith(href + '/'));

  return (
    <Link
      href={href}
      prefetch={true}
      className={cn(
        "flex flex-col items-center justify-center w-16 transition-colors",
        isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"
      )}
    >
      <Icon className={cn("h-6 w-6 mb-1 transition-transform", isActive ? "text-primary fill-primary/20 scale-110" : "")} />
      <span className={cn("text-[10px]", isActive ? "font-bold text-primary" : "font-medium")}>{label}</span>
    </Link>
  )
}
