"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
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
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-6">
      <div className="space-y-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@propertymgmt.com"
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Sending…" : "Send magic link"}
      </Button>
      {msg ? (
        <p className="text-muted-foreground text-xs leading-relaxed">{msg}</p>
      ) : null}
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CertShield</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Sign in to review COIs. Demo mode skips this when Supabase env is
          unset.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
