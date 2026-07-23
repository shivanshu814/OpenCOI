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
      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">API keys (E4)</h2>
        <p className="text-muted-foreground text-xs">
          Use{" "}
          <code className="text-foreground">
            Authorization: Bearer cs_live_…
          </code>{" "}
          against <code className="text-foreground">/api/v1/vendors</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-xs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name"
          />
          <Button
            size="sm"
            disabled={busy}
            onClick={() => void post({ action: "create_key", name })}
          >
            Create key
          </Button>
        </div>
        {rawKey ? (
          <p className="break-all rounded border bg-muted/40 p-2 font-mono text-xs">
            {rawKey}
          </p>
        ) : null}
        <ul className="text-muted-foreground space-y-1 text-xs">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between gap-2">
              <span>
                {k.name} · {k.key_prefix}… {k.revoked_at ? "(revoked)" : ""}
              </span>
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
        </ul>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Outbound webhooks</h2>
        <p className="text-muted-foreground text-xs">
          Events: vendor.status_changed, document.published. Verify{" "}
          <code className="text-foreground">X-CertShield-Signature</code> (HMAC
          SHA-256 of body).
        </p>
        <div className="space-y-1">
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
          <p className="break-all rounded border bg-muted/40 p-2 font-mono text-xs">
            Secret: {secret}
          </p>
        ) : null}
        <ul className="text-muted-foreground space-y-1 text-xs">
          {webhooks.map((w) => (
            <li key={w.id}>
              {w.active ? "ON" : "OFF"} · {w.url}
            </li>
          ))}
        </ul>
      </section>

      {msg ? <p className="text-muted-foreground text-xs">{msg}</p> : null}
    </div>
  );
}
