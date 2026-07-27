"use client";

import { CardLiveAccent, LiveBadge } from "@/components/live-activity";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CACHE_POLICIES } from "@/lib/live/policy";
import { useCachedResource } from "@/lib/live/use-live";
import {
  notifyApiError,
  notifyCaughtError,
  notifySuccess,
} from "@/lib/ui/toast";
import { formatDateTime } from "@/lib/ui/format";
import { FileSignature } from "lucide-react";
import { useRef, useState } from "react";

type TemplateState = {
  template: { name: string | null; uploadedAt: string | null } | null;
};

/**
 * A5 — the agreement PDF vendors are asked to e-sign.
 *
 * CertShield deliberately does not author this document. Generating
 * hold-harmless or indemnification wording would be legal drafting, which
 * docs/08 §3 puts firmly out of scope, so the customer uploads the PDF their
 * own counsel approved and we route it for signature.
 *
 * Until one is uploaded, e-sign is honestly unavailable rather than producing
 * a signing link with nothing behind it — the exact failure that made every
 * generated link 404.
 */
export function AgreementTemplateCard({
  orgId,
  canManage,
}: {
  orgId: string | null;
  canManage: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, refreshing, mutate, refetch } =
    useCachedResource<TemplateState>(
      CACHE_POLICIES.agreementTemplate,
      async () => {
        const res = await fetch("/api/settings/agreement-template");
        if (!res.ok) throw new Error("Could not load the agreement template");
        return (await res.json()) as TemplateState;
      },
      { orgId },
    );

  const template = data?.template ?? null;

  async function onUpload(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/settings/agreement-template", {
        method: "POST",
        body,
      });
      const json = (await res.json()) as TemplateState & { error?: string };
      if (!res.ok) {
        notifyApiError(json, "Agreement not uploaded");
        return;
      }
      mutate({ template: json.template });
      notifySuccess(`Agreement template saved — ${file.name}`);
    } catch (e) {
      notifyCaughtError(e, "Agreement not uploaded");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    try {
      const res = await fetch("/api/settings/agreement-template", {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        notifyApiError(json, "Agreement not removed");
        return;
      }
      mutate({ template: null });
      notifySuccess("Agreement template removed — e-sign is off until you add one");
    } catch (e) {
      notifyCaughtError(e, "Agreement not removed");
    } finally {
      setBusy(false);
      void refetch();
    }
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardLiveAccent />
      <CardHeader className="border-b pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="bg-brand-muted text-brand flex size-6 items-center justify-center rounded-md">
            <FileSignature className="size-3.5" />
          </span>
          Agreement for e-sign
          <LiveBadge
            label={template ? "Ready" : "Not set"}
            tone={template ? "ok" : "warn"}
          />
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          The PDF vendors are asked to sign (hold-harmless, indemnification,
          your vendor terms). Upload the version your own attorney approved —
          CertShield stores and routes it, and never drafts agreement language
          for you.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 py-4 sm:px-5">
        {loading ? (
          <Skeleton className="h-9 w-full max-w-sm rounded-md" />
        ) : template ? (
          <p className="text-sm">
            <span className="font-medium">{template.name ?? "Agreement.pdf"}</span>
            {template.uploadedAt ? (
              <span className="text-muted-foreground">
                {" "}
                · uploaded {formatDateTime(template.uploadedAt)}
              </span>
            ) : null}
            {refreshing ? (
              <span className="text-muted-foreground text-xs"> · checking…</span>
            ) : null}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm leading-relaxed">
            No agreement uploaded, so &ldquo;Send for signature&rdquo; on a
            vendor stays unavailable. There is nothing for a vendor to sign
            until you add your document here.
          </p>
        )}

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              id="agreement-template-file"
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              pending={busy}
              pendingGlyph="pen"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy
                ? "Working…"
                : template
                  ? "Replace PDF"
                  : "Upload agreement PDF"}
            </Button>
            {template ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void onRemove()}
              >
                Remove
              </Button>
            ) : null}
            <span className="text-muted-foreground text-xs">
              PDF only, up to 10 MB.
            </span>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            Admin only — ask a workspace admin to upload or change this.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
