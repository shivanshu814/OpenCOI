"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  templateDownloadLeadSchema,
  type TemplateDownloadLeadInput,
} from "@/lib/validation/schemas";
import Link from "next/link";
import { useState } from "react";

type CaptureResponse = {
  ok?: boolean;
  error?: string;
  downloadUrl?: string;
};

export function TemplateDownloadCapture() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const fd = new FormData(e.currentTarget);
      const payload: TemplateDownloadLeadInput = {
        email: (fd.get("email") ?? "").toString(),
        companyWebsite: (fd.get("companyWebsite") ?? "").toString(),
      };

      const parsed = templateDownloadLeadSchema.safeParse(payload);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Enter a valid email.");
        return;
      }

      const response = await fetch("/api/lead-magnets/coi-tracking-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json().catch(() => null)) as CaptureResponse | null;
      if (!response.ok || !data?.ok || !data.downloadUrl) {
        setError(data?.error ?? "Couldn't unlock the template right now.");
        return;
      }

      window.location.assign(data.downloadUrl);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="template-download"
      className="border-border/80 bg-card space-y-3 rounded-xl border p-5 shadow-xs"
      aria-label="Template download"
    >
      <h2 className="text-base font-semibold">Download the free CSV template</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Enter your email to unlock the spreadsheet download.
      </p>
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            aria-label="Email address"
            disabled={busy}
          />
          <Button type="submit" size="lg" pending={busy} disabled={busy}>
            {busy ? "Unlocking…" : "Unlock download"}
          </Button>
        </div>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
        <p className="text-muted-foreground text-xs">
          By downloading, you agree to receive template-related follow-ups. See{" "}
          <Link
            href="/privacy"
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            Privacy
          </Link>
          .
        </p>
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "-10000px",
            width: "1px",
            height: "1px",
            overflow: "hidden",
          }}
        >
          <label htmlFor="companyWebsite">Company website</label>
          <input
            type="text"
            id="companyWebsite"
            name="companyWebsite"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
      </form>
    </section>
  );
}
