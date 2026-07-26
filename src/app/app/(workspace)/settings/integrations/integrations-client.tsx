"use client";

import {
  CardLiveAccent,
  LiveBadge,
  LiveCount,
} from "@/components/live-activity";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";
import {
  notifyApiError,
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/lib/ui/toast";
import { useCallback, useEffect, useState } from "react";

export function IntegrationsClient() {
  const [keys, setKeys] = useState<
    {
      id: string;
      name: string;
      key_prefix: string;
      revoked_at: string | null;
    }[]
  >([]);
  const [webhooks, setWebhooks] = useState<
    { id: string; url: string; active: boolean; events: string[] }[]
  >([]);
  const [name, setName] = useState("Zapier");
  const [url, setUrl] = useState("");
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings/integrations");
    const data = (await res.json()) as {
      keys?: typeof keys;
      webhooks?: typeof webhooks;
      error?: string;
    };
    if (data.error) {
      setLoadError(data.error);
      notifyError(data.error);
      return;
    }
    setLoadError(null);
    setKeys(data.keys ?? []);
    setWebhooks(data.webhooks ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        error?: string;
        raw_key?: string;
        secret?: string;
        warning?: string;
      };
      if (!res.ok) {
        notifyApiError(data, "Could not save");
        return;
      }
      if (data.raw_key) {
        setRawKey(data.raw_key);
        notifySuccess("API key created — copy it now");
      } else if (data.secret) {
        setSecret(data.secret);
        notifySuccess("Webhook added — store the signing secret");
      } else if (body.action === "revoke_key") {
        notifySuccess("API key revoked");
      } else if (data.warning) {
        notifyWarning(data.warning);
      } else {
        notifySuccess("Saved");
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-brand/15 bg-brand-muted/40 space-y-3 rounded-xl border px-4 py-3.5 sm:px-5">
        <p className="text-sm leading-relaxed">
          <span className="text-foreground font-medium">In plain words:</span>{" "}
          <span className="text-muted-foreground">
            API keys let Zapier or your own scripts read vendor status from
            CertShield. Webhooks push a ping to your tools when a vendor&apos;s
            status changes or a COI verdict is published — so work-order systems
            can block non-compliant vendors.
          </span>
        </p>
        <ul className="text-muted-foreground list-inside list-disc space-y-1 text-xs leading-relaxed sm:text-sm">
          <li>
            Sync compliant / non-compliant flags into AppFolio, Buildium, or a
            spreadsheet via Zapier
          </li>
          <li>
            Notify Slack when a vendor drops out of compliance (do-not-dispatch)
          </li>
          <li>
            Pull vendor lists into an internal dashboard without logging into
            CertShield
          </li>
        </ul>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Most property managers never need this page — skip it unless you&apos;re
          on Business or connecting custom tooling. Native AppFolio/Buildium
          connectors are not live yet; Zapier + REST is the path today.
        </p>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardLiveAccent />
        <CardHeader className="border-b pt-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            API keys
            <LiveBadge label="Live" />
          </CardTitle>
          <CardDescription className="text-xs">
            Create a key when you want another tool to ask CertShield for vendor
            data. Name it after the tool (e.g. Zapier).
          </CardDescription>
          <CardAction className="self-center">
            <LiveCount value={keys.length} />
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-3 py-4 sm:px-5">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Key name</Label>
              <Input
                id="key-name"
                className="max-w-xs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Key name"
              />
            </div>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void post({ action: "create_key", name })}
            >
              Create key
            </Button>
          </div>
          {rawKey ? (
            <Alert>
              <AlertTitle>
                Copy this key now — it won&apos;t be shown again.
              </AlertTitle>
              <AlertDescription>
                <span className="font-mono text-xs break-all">{rawKey}</span>
              </AlertDescription>
            </Alert>
          ) : null}

          <Collapsible className="group">
            <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium transition-colors">
              <ChevronDown className="size-3.5 transition-transform group-data-open:rotate-180" />
              Technical details
            </CollapsibleTrigger>
            <CollapsibleContent className="text-muted-foreground mt-2 space-y-1.5 text-xs leading-relaxed">
              <p>
                Send{" "}
                <code className="text-foreground">
                  Authorization: Bearer cs_live_…
                </code>{" "}
                to{" "}
                <code className="text-foreground">/api/v1/vendors</code>. Revoke
                a key immediately if it leaks.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>

        <ul className="divide-y border-t">
          {keys.length > 0 ? (
            <li
              className="text-muted-foreground bg-muted/40 hidden items-center gap-x-3 border-b px-4 py-2 text-[11px] font-medium tracking-wide uppercase sm:grid sm:grid-cols-[minmax(0,1fr)_auto]"
              aria-hidden
            >
              <span>Key</span>
              <span className="text-right">Action</span>
            </li>
          ) : null}
          {keys.map((k) => (
            <li
              key={k.id}
              className="hover:bg-muted/40 grid items-center gap-x-3 gap-y-1 px-4 py-2.5 transition-colors sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <span className="text-sm font-medium">{k.name}</span>
                <span className="text-muted-foreground ml-2 font-mono text-xs">
                  {k.key_prefix}…
                </span>
                {k.revoked_at ? (
                  <span className="text-muted-foreground ml-2 text-xs">
                    (revoked)
                  </span>
                ) : null}
              </div>
              {!k.revoked_at ? (
                <AlertDialog>
                  <AlertDialogTrigger
                    disabled={busy}
                    render={
                      <Button
                        size="sm"
                        variant="ghost"
                        className="justify-self-start sm:justify-self-end"
                      />
                    }
                  >
                    Revoke
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {k.name}{" "}
                        <span className="font-mono">({k.key_prefix}…)</span>{" "}
                        will stop working immediately — anything connected with
                        it loses access. This can&apos;t be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogCancel
                        variant="destructive"
                        onClick={() =>
                          void post({ action: "revoke_key", key_id: k.id })
                        }
                      >
                        Revoke key
                      </AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </li>
          ))}
          {keys.length === 0 ? (
            <li className="text-muted-foreground px-4 py-6 text-center text-sm">
              No API keys yet — create one only when you&apos;re ready to connect
              Zapier or your own tooling.
            </li>
          ) : null}
        </ul>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <CardLiveAccent />
        <CardHeader className="border-b pt-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            Outbound webhooks
            <LiveBadge label="Live" tone="info" />
          </CardTitle>
          <CardDescription className="text-xs">
            Paste a Zapier (or other) hook URL to get notified when vendor status
            changes — no need to poll CertShield.
          </CardDescription>
          <CardAction className="self-center">
            <LiveCount value={webhooks.length} />
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-3 py-4 sm:px-5">
          <div className="space-y-1.5">
            <Label htmlFor="wh-url">Endpoint URL</Label>
            <Input
              id="wh-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/…"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !url.trim()}
            onClick={() => void post({ action: "create_webhook", url })}
          >
            Add webhook
          </Button>
          {secret ? (
            <Alert>
              <AlertTitle>
                Signing secret — store it now, it won&apos;t be shown again.
              </AlertTitle>
              <AlertDescription>
                <span className="font-mono text-xs break-all">{secret}</span>
              </AlertDescription>
            </Alert>
          ) : null}

          <Collapsible className="group">
            <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium transition-colors">
              <ChevronDown className="size-3.5 transition-transform group-data-open:rotate-180" />
              Technical details
            </CollapsibleTrigger>
            <CollapsibleContent className="text-muted-foreground mt-2 space-y-1.5 text-xs leading-relaxed">
              <p>
                Events:{" "}
                <code className="text-foreground">vendor.status_changed</code>,{" "}
                <code className="text-foreground">document.published</code>.
                Verify{" "}
                <code className="text-foreground">X-CertShield-Signature</code>{" "}
                (HMAC SHA-256 of the body) with the signing secret.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>

        <ul className="divide-y border-t">
          {webhooks.map((w) => (
            <li
              key={w.id}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm"
            >
              <span
                className={`size-1.5 shrink-0 rounded-full ${
                  w.active ? "bg-[var(--status-ok)]" : "bg-[var(--status-neutral)]"
                }`}
              />
              <span className="min-w-0 truncate font-mono text-xs">
                {w.url}
              </span>
              <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                {w.active ? "Active" : "Off"}
              </span>
            </li>
          ))}
          {webhooks.length === 0 ? (
            <li className="text-muted-foreground px-4 py-6 text-center text-sm">
              No webhooks yet — add an endpoint only when another system needs
              live status updates.
            </li>
          ) : null}
        </ul>
      </Card>

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
