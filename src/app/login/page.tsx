"use client";

import { BrandMark } from "@/components/certshield-logo";
import { SURFACE_BG } from "@/components/ink-atmosphere";
import { LiveBadgeOnDark, LiveOpsTicker } from "@/components/live-activity";
import { PortfolioPreviewCard } from "@/components/product-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const search = useSearchParams();
  const next = search.get("next") ?? "/app";
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setOk(false);
    try {
      const supabase = createClient();
      const appUrl = (
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        (typeof window !== "undefined" &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
          ? window.location.origin
          : "https://getcertshield.vercel.app")
      ).replace(/\/$/, "");

      const redirectTo = `${appUrl}/auth/callback`;
      document.cookie = `cs_auth_next=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setMsg(error.message);
      } else {
        setOk(true);
        setMsg(`Check ${email} for your one-time link.`);
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border-border/80 py-0 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.28)]">
      <div className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r" />

      <CardHeader className="space-y-1 border-b border-border/70 px-6 pt-6 pb-5">
        <p className="text-brand text-[11px] font-semibold tracking-[0.16em] uppercase">
          Workspace access
        </p>
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Enter your work email. We&apos;ll send a one-time magic link — no
          password.
        </p>
      </CardHeader>

      <CardContent className="px-6 pt-6 pb-2">
        <form onSubmit={onSubmit} className="space-y-5">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="email" className="text-sm font-medium">
                Work email
              </FieldLabel>
              <div className="relative">
                <Mail
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@propertymgmt.com"
                  className="h-11 rounded-lg pl-10"
                />
              </div>
            </Field>

            <Button
              type="submit"
              size="lg"
              className="bg-brand text-brand-foreground hover:bg-brand/90 h-11 w-full rounded-lg text-sm font-semibold shadow-[0_0_0_1px_rgba(0,184,132,0.25),0_10px_28px_-10px_rgba(0,184,132,0.55)]"
              disabled={busy}
            >
              {busy ? "Sending…" : "Send magic link"}
              {!busy ? (
                <ArrowRight
                  data-icon="inline-end"
                  className="size-4"
                  strokeWidth={2.25}
                />
              ) : null}
            </Button>
          </FieldGroup>

          {msg ? (
            <Alert
              variant={ok ? "default" : "destructive"}
              className={
                ok
                  ? "border-brand/20 bg-brand-muted/40 text-foreground"
                  : undefined
              }
            >
              {ok ? <CheckCircle2 className="text-brand" /> : <CircleAlert />}
              {ok ? <AlertTitle>Link sent</AlertTitle> : null}
              <AlertDescription>{msg}</AlertDescription>
            </Alert>
          ) : null}
        </form>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-4 border-t border-border/70 bg-muted/30 px-6 py-5">
        <ul className="text-muted-foreground flex flex-col gap-2.5 text-xs">
          <li className="flex items-center gap-2">
            <Lock className="text-brand size-3.5 shrink-0" strokeWidth={2} />
            Magic link expires after one use
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck
              className="text-brand size-3.5 shrink-0"
              strokeWidth={2}
            />
            US-region data · org-scoped access
          </li>
        </ul>

        <Link
          href="/pricing"
          className="text-foreground hover:text-brand inline-flex items-center justify-center gap-1.5 text-sm font-medium transition-colors"
        >
          See plans from $99
          <ArrowRight className="size-3.5" strokeWidth={2.25} aria-hidden />
        </Link>
      </CardFooter>
    </Card>
  );
}

function LoginFormFallback() {
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border-border/80 py-0 shadow-xs">
      <div className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r" />
      <CardContent className="text-muted-foreground px-6 py-16 text-center text-sm">
        Loading…
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="bg-background flex min-h-svh flex-col md:flex-row">
      {/* Left — CertShield brand panel */}
      <aside className="relative hidden min-h-svh w-full overflow-hidden md:flex md:w-[46%] lg:w-[44%] xl:w-[42%]">
        <div
          className="absolute inset-0 bg-[oklch(0.22_0.03_260)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 20% 10%, oklch(0.68 0.14 163 / 0.35), transparent), radial-gradient(ellipse 60% 50% at 90% 80%, oklch(0.45 0.08 250 / 0.4), transparent)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />

        <div className="relative flex min-h-svh w-full flex-col justify-between p-10 text-white">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" aria-label="CertShield home" className="w-fit">
              <BrandMark
                markSize={32}
                wordmarkClassName="text-white text-[1.125rem]"
              />
            </Link>
            <LiveBadgeOnDark label="Live" />
          </div>

          <div className="max-w-lg space-y-8">
            <div>
              <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
                COI tracking for property managers
              </p>
              <div className="mt-4">
                <LiveOpsTicker />
              </div>
              <h2 className="mt-5 text-3xl leading-[1.15] font-semibold tracking-tight text-balance xl:text-[2.125rem]">
                Never work with an uninsured vendor again.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65">
                Sign in to review COIs, chase renewals, and keep every verdict
                audit-ready.
              </p>
            </div>

            <div aria-hidden>
              <PortfolioPreviewCard compact glow={false} />
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-white/40">
            Document review assistance — not legal, insurance, or professional
            advice.
          </p>
        </div>
      </aside>

      {/* Right — form pane */}
      <div
        className={`relative flex min-h-svh flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-8 lg:px-12 ${SURFACE_BG}`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 55% 40% at 50% 0%, oklch(0.68 0.14 163 / 0.12), transparent), radial-gradient(ellipse 45% 35% at 100% 100%, oklch(0.45 0.06 260 / 0.06), transparent)",
          }}
        />

        <div className="relative w-full max-w-[420px] space-y-8">
          <div className="space-y-4 md:hidden">
            <Link
              href="/"
              aria-label="CertShield home"
              className="inline-block"
            >
              <BrandMark markSize={30} />
            </Link>
            <div>
              <p className="text-brand text-[11px] font-semibold tracking-[0.16em] uppercase">
                COI tracking
              </p>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                Never work with an uninsured vendor again.
              </p>
            </div>
          </div>

          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>

          <p className="text-muted-foreground text-center text-[11px] leading-relaxed">
            Document review assistance — not legal, insurance, or professional
            advice.
          </p>
        </div>
      </div>
    </div>
  );
}
