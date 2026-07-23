"use client";

import { DisclaimerFooter } from "@/components/disclaimer-footer";
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
import {
  Building2,
  ClipboardCheck,
  CreditCard,
  FileText,
  FolderKanban,
  KeyRound,
  LayoutGrid,
  LifeBuoy,
  ScrollText,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/app" />}
              tooltip="CertShield"
            >
              <span className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <ShieldCheck className="size-4.5" />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold tracking-tight">
                  CertShield
                </span>
                <span className="text-sidebar-foreground/60 truncate text-xs">
                  COI compliance
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label ?? "root"}>
            {group.label ? (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive(pathname, item)}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Help & docs"
              render={<Link href="/help" />}
            >
              <LifeBuoy />
              <span>Help &amp; docs</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={live ? "Workspace connected" : "Demo mode"}
              render={<Link href="/login" />}
            >
              <span className="flex size-4 items-center justify-center">
                <span
                  className={
                    live
                      ? "bg-sidebar-primary size-2 rounded-full"
                      : "size-2 rounded-full bg-amber-400"
                  }
                />
              </span>
              <span className="truncate text-xs">
                {live ? "Workspace connected" : "Demo mode — connect Supabase"}
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
  const { current, isDetail } = useBreadcrumb(pathname);

  return (
    <header className="bg-background/90 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
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

      <div className="ml-auto flex items-center gap-2">
        <Button
          size="sm"
          className="hidden sm:inline-flex"
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
                className="focus-visible:ring-ring/50 rounded-full outline-none focus-visible:ring-3"
              />
            }
          >
            <Avatar className="size-8">
              <AvatarFallback>
                <UserRound className="size-4" />
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              {live ? "Workspace connected" : "Demo mode"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
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
            <DropdownMenuItem render={<Link href="/login" />}>
              <UserRound /> Account
            </DropdownMenuItem>
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
      <SidebarInset>
        <AppHeader live={live} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <DisclaimerFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}
