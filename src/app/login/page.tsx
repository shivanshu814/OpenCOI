"use client";

import { BrandMark } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const search = useSearchParams();
  const next = search.get("next") ?? "/app";
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const supabase = createClient();
      // Canonical prod URL — never rely on window.origin (localhost emails)
      // or empty NEXT_PUBLIC_APP_URL. Query-string redirects often fail
      // Supabase allowlist matching and silently fall back to Site URL.
      const appUrl = (
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        (typeof window !== "undefined" &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
          ? window.location.origin
          : "https://getcertshield.vercel.app")
      ).replace(/\/$/, "");

      const redirectTo = `${appUrl}/auth/callback`;

      // Persist post-login path in a cookie (callback reads it)
      document.cookie = `cs_auth_next=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });
      if (error) {
        setMsg(error.message);
      } else {
        setMsg(
          `Check your email for the magic link. (redirect → ${redirectTo})`,
        );
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="[--card-spacing:--spacing(6)] shadow-sm">
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="email">Work email</FieldLabel>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@propertymgmt.com"
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Send magic link"}
            </Button>
            {msg ? (
              <FieldDescription className="text-xs leading-relaxed">
                {msg}
              </FieldDescription>
            ) : null}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="bg-background flex min-h-full flex-col px-4 py-16">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6">
        <div className="space-y-3">
          <Link href="/" aria-label="CertShield home" className="inline-block">
            <BrandMark />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Sign in to review COIs. Demo mode skips this when Supabase env is
              unset.
            </p>
          </div>
        </div>
        <Suspense
          fallback={<p className="text-muted-foreground text-sm">Loading…</p>}
        >
          <LoginForm />
        </Suspense>
        <p className="text-muted-foreground text-xs">
          No password needed — we email you a magic link.
        </p>
      </div>
    </div>
  );
}
