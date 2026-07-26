"use client";

import { CertShieldMark } from "@/components/certshield-logo";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { AppLiveTicker, LiveBadge, LiveDot } from "@/components/live-activity";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/client";
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
  LogOut,
  ScrollText,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
    items: [
      { href: "/app", label: "Dashboard", icon: LayoutGrid, exact: true },
    ],
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
      {
        href: "/app/settings/integrations",
        label: "API & integrations",
        icon: KeyRound,
      },
      { href: "/app/settings/billing", label: "Billing", icon: CreditCard },
      { href: "/app/admin", label: "Admin", icon: ShieldCheck },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, item: NavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Best-effort breadcrumb from the nav map; deeper segments render as the page. */
function useBreadcrumb(pathname: string) {
  const current =
    ALL_ITEMS.filter((i) => isActive(pathname, i)).sort(
      (a, b) => b.href.length - a.href.length,
    )[0] ?? null;
  const isDetail = current != null && pathname !== current.href;
  return { current, isDetail };
}

function AppSidebar({ live }: { live: boolean }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border py-0 group-data-[collapsible=icon]:px-1.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/app" />}
              tooltip="CertShield"
              className="gap-2.5 overflow-hidden group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0!"
            >
              <CertShieldMark size={22} />
              <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold tracking-tight">
                  CertShield
                </span>
                <span className="text-muted-foreground truncate text-[11px] font-medium">
                  COI compliance
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-1 overflow-x-hidden px-2 py-3 group-data-[collapsible=icon]:px-1.5">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label ?? "root"} className="px-0">
            {group.label ? (
              <SidebarGroupLabel className="text-muted-foreground px-2 text-[11px] font-semibold tracking-wider uppercase">
                {group.label}
              </SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu className="group-data-[collapsible=icon]:items-center">
                {group.items.map((item) => {
                  const active = isActive(pathname, item);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                        className={cn(
                          "h-8 text-sm font-medium group-data-[collapsible=icon]:justify-center",
                          active && "sidebar-active-indicator text-brand",
                        )}
                      >
                        <item.icon />
                        <span className="group-data-[collapsible=icon]:hidden">
                          {item.label}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="overflow-x-hidden group-data-[collapsible=icon]:px-1.5">
        <SidebarSeparator />
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Help & docs"
              render={<Link href="/help" />}
              className="h-8 text-sm group-data-[collapsible=icon]:justify-center"
            >
              <LifeBuoy />
              <span className="group-data-[collapsible=icon]:hidden">
                Help &amp; docs
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={live ? "Workspace connected" : "Demo mode"}
              render={<Link href="/login" />}
              className="h-8 text-sm group-data-[collapsible=icon]:justify-center"
            >
              <span className="flex size-4 items-center justify-center">
                <LiveDot tone={live ? "ok" : "warn"} />
              </span>
              <span className="text-muted-foreground truncate text-xs group-data-[collapsible=icon]:hidden">
                {live ? "Workspace connected" : "Demo mode"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function AppHeader({ live }: { live: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { current, isDetail } = useBreadcrumb(pathname);

  async function onSignOut() {
    try {
      await createClient().auth.signOut();
    } catch {
      // Cookie may already be gone — fall through to /login either way.
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <SidebarTrigger className="-ml-1 size-8 shrink-0" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap items-center">
          <BreadcrumbItem className="hidden sm:block">
            <BreadcrumbLink render={<Link href="/app" />}>
              CertShield
            </BreadcrumbLink>
          </BreadcrumbItem>
          {current ? (
            <>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem>
                {isDetail ? (
                  <BreadcrumbLink render={<Link href={current.href} />}>
                    {current.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{current.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {isDetail ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Detail</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : null}
            </>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex h-8 items-center gap-2">
        <AppLiveTicker demo={!live} />
        {live ? (
          <LiveBadge
            label="Online"
            tone="ok"
            className="hidden h-8 px-2.5 lg:inline-flex"
          />
        ) : (
          <LiveBadge
            label="Demo"
            tone="warn"
            className="hidden h-8 px-2.5 sm:inline-flex"
          />
        )}
        <Button
          size="sm"
          className="hidden h-8 sm:inline-flex"
          render={<Link href="/app/upload" />}
        >
          <Upload data-icon="inline-start" />
          Upload COI
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Account menu"
                className="focus-visible:ring-ring/50 inline-flex size-8 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3"
              />
            }
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-brand-muted text-brand text-xs font-semibold">
                <UserRound className="size-4" />
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {live ? "Workspace connected" : "Demo mode"}
              </DropdownMenuLabel>
              <DropdownMenuItem render={<Link href="/app/settings/team" />}>
                <Users /> Team
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/app/settings/billing" />}>
                <CreditCard /> Billing
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/app/settings/integrations" />}
              >
                <KeyRound /> API &amp; integrations
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/help" />}>
              <LifeBuoy /> Help &amp; docs
            </DropdownMenuItem>
            {live ? (
              <DropdownMenuItem variant="destructive" onClick={onSignOut}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function AppShell({
  live,
  children,
}: {
  live: boolean;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar live={live} />
      <SidebarInset className="bg-background">
        <AppHeader live={live} />
        <main className="w-full flex-1 space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          {children}
        </main>
        <DisclaimerFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}
