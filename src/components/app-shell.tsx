"use client";

import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { cn } from "@/lib/utils";
import {
  Building2,
  ClipboardCheck,
  CreditCard,
  FileText,
  FolderKanban,
  KeyRound,
  LayoutGrid,
  LifeBuoy,
  Menu,
  ScrollText,
  ShieldCheck,
  Upload,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

type NavGroup = { label: string | null; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/app", label: "Dashboard", icon: LayoutGrid, exact: true }],
  },
  {
    label: "Compliance",
    items: [
      { href: "/app/review", label: "Review queue", icon: ClipboardCheck },
      { href: "/app/upload", label: "Upload COI", icon: Upload },
      { href: "/app/vendors", label: "Vendors", icon: Wrench },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { href: "/app/properties", label: "Properties", icon: Building2 },
      { href: "/app/projects", label: "Projects", icon: FolderKanban },
    ],
  },
  {
    label: "Reporting",
    items: [
      { href: "/app/reports", label: "Reports", icon: FileText },
      { href: "/app/audit", label: "Audit trail", icon: ScrollText },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/app/settings/team", label: "Team", icon: Users },
      { href: "/app/settings/integrations", label: "API & integrations", icon: KeyRound },
      { href: "/app/settings/billing", label: "Billing", icon: CreditCard },
      { href: "/app/admin", label: "Admin", icon: ShieldCheck },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SidebarContent({ live }: { live: boolean }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/app"
        className="flex items-center gap-2.5 px-5 pt-5 pb-6"
        aria-label="CertShield dashboard"
      >
        <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-7 items-center justify-center rounded-md">
          <ShieldCheck className="size-4.5" />
        </span>
        <span className="text-sidebar-accent-foreground text-[0.95rem] font-semibold tracking-tight">
          CertShield
        </span>
      </Link>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label ?? "root"}>
            {group.label ? (
              <p className="text-sidebar-foreground/55 px-2 pb-1.5 text-[0.68rem] font-medium tracking-[0.08em] uppercase">
                {group.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[0.83rem] transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          active
                            ? "text-sidebar-primary"
                            : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground",
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-sidebar-border border-t px-3 py-3">
        <Link
          href="/help"
          className="text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[0.83rem] transition-colors"
        >
          <LifeBuoy className="text-sidebar-foreground/60 size-4" />
          Help & docs
        </Link>
        <Link
          href="/login"
          className="text-sidebar-foreground/70 hover:text-sidebar-accent-foreground mt-1 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors"
        >
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              live ? "bg-sidebar-primary" : "bg-amber-400",
            )}
          />
          {live ? "Workspace connected" : "Demo mode — connect Supabase"}
        </Link>
      </div>
    </div>
  );
}

export function AppShell({
  live,
  children,
}: {
  live: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="bg-background flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-30 hidden w-60 border-r lg:block">
        <SidebarContent live={live} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="bg-sidebar animate-in slide-in-from-left absolute inset-y-0 left-0 w-64 shadow-xl duration-200">
            <button
              type="button"
              aria-label="Close menu"
              className="text-sidebar-foreground hover:text-sidebar-accent-foreground absolute top-4 right-3 p-1"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-4.5" />
            </button>
            <SidebarContent live={live} />
          </aside>
        </div>
      ) : null}

      {/* Content column */}
      <div className="flex min-h-full min-w-0 flex-1 flex-col lg:pl-60">
        {/* Mobile topbar */}
        <header className="bg-background/90 sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-2.5 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            className="text-muted-foreground hover:text-foreground -ml-1 p-1"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <Link href="/app" className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <ShieldCheck className="size-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              CertShield
            </span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <DisclaimerFooter />
      </div>
    </div>
  );
}
