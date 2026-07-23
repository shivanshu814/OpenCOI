"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

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
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/settings/integrations");
    const data = (await res.json()) as {
      keys?: typeof keys;
      webhooks?: typeof webhooks;
      error?: string;
    };
    if (data.error) {
      setMsg(data.error);
      return;
    }
    setKeys(data.keys ?? []);
    setWebhooks(data.webhooks ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
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
        setMsg(data.error ?? "Failed");
        return;
      }
      if (data.raw_key) setRawKey(data.raw_key);
      if (data.secret) setSecret(data.secret);
      setMsg(data.warning ?? "Saved");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="bg-card rounded-xl border">
        <div className="border-b px-4 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">API keys (E4)</h2>
            <span className="text-muted-foreground text-xs tabular-nums">
              {keys.length}
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Use{" "}
            <code className="text-foreground">
              Authorization: Bearer cs_live_…
            </code>{" "}
            against <code className="text-foreground">/api/v1/vendors</code>.
          </p>
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-5">
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
            <div className="bg-muted/40 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs font-medium">
                Copy this key now — it won&apos;t be shown again.
              </p>
              <p className="mt-1 font-mono text-xs break-all">{rawKey}</p>
            </div>
          ) : null}
        </div>

        <ul className="divide-y border-t">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between gap-2 px-4 py-2.5"
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
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    void post({ action: "revoke_key", key_id: k.id })
                  }
                >
                  Revoke
                </Button>
              ) : null}
            </li>
          ))}
          {keys.length === 0 ? (
            <li className="text-muted-foreground px-4 py-6 text-center text-sm">
              No API keys yet — create one to connect Zapier or your own
              tooling.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="bg-card rounded-xl border">
        <div className="border-b px-4 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Outbound webhooks</h2>
            <span className="text-muted-foreground text-xs tabular-nums">
              {webhooks.length}
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Events: vendor.status_changed, document.published. Verify{" "}
            <code className="text-foreground">X-CertShield-Signature</code>{" "}
            (HMAC SHA-256 of body).
          </p>
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-5">
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
            <div className="bg-muted/40 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs font-medium">
                Signing secret — store it now, it won&apos;t be shown again.
              </p>
              <p className="mt-1 font-mono text-xs break-all">{secret}</p>
            </div>
          ) : null}
        </div>

        <ul className="divide-y border-t">
          {webhooks.map((w) => (
            <li
              key={w.id}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm"
            >
              <span
                className={`size-1.5 shrink-0 rounded-full ${
                  w.active ? "bg-emerald-500" : "bg-slate-400"
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
              No webhooks yet — add an endpoint to get notified when a vendor
              status changes or a document is published.
            </li>
          ) : null}
        </ul>
      </section>

      {msg ? <p className="text-muted-foreground text-xs">{msg}</p> : null}
    </div>
  );
}
