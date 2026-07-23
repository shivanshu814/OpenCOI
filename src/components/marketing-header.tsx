"use client";

import { BrandMark } from "@/components/certshield-logo";
import { LiveBadgeOnDark, LiveOpsTicker } from "@/components/live-activity";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const nav = [
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/help", label: "Help" },
];

function NavLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-white/10 text-white shadow-xs"
          : "text-white/60 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[oklch(0.22_0.03_260)]/90 backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent"
      />

      <div className="relative mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="CertShield home"
          className="group shrink-0 transition-opacity hover:opacity-90"
        >
          <BrandMark
            markSize={30}
            wordmarkClassName="text-white text-[1.0625rem] tracking-tight"
          />
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-1 sm:flex">
          {nav.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LiveOpsTicker className="mr-1 hidden max-w-[14rem] lg:inline-flex xl:max-w-[18rem]" />
          <LiveBadgeOnDark
            label="Live"
            className="hidden md:inline-flex lg:hidden"
          />
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white sm:inline-flex"
          >
            Sign in
          </Link>
          <Button
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand/90 h-9 rounded-lg px-3.5 text-sm font-semibold shadow-[0_0_0_1px_rgba(0,184,132,0.35),0_8px_24px_-8px_rgba(0,184,132,0.65)]"
            render={<Link href="/pricing" />}
          >
            Start from $99
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-white hover:bg-white/10 hover:text-white sm:hidden"
                  aria-label="Open menu"
                />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="border-white/10 bg-[oklch(0.22_0.03_260)] text-white sm:max-w-xs"
            >
              <SheetHeader>
                <SheetTitle className="text-left text-white">
                  <BrandMark
                    markSize={26}
                    wordmarkClassName="text-white text-sm"
                  />
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-1">
                {nav.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Sign in
                </Link>
                <div className="mt-4 px-1">
                  <LiveOpsTicker className="w-full justify-start" />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
