"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

type Props = {
  token: string;
  locale: "en" | "es";
  agentEmail: string | null;
};

const copy = {
  en: {
    uploadTitle: "Upload your COI (PDF)",
    uploadHint: "ACORD 25 preferred. Max 20MB.",
    submit: "Upload PDF",
    uploading: "Uploading…",
    success: "Received — your certificate is in review.",
    agentTitle: "Forward to my insurance agent",
    agentHint:
      "We’ll email your agent a request to send the COI. You stay on the thread.",
    agentSubmit: "Send to agent",
    agentSending: "Sending…",
    agentOk: "Request sent to your agent.",
  },
  es: {
    uploadTitle: "Suba su COI (PDF)",
    uploadHint: "Se prefiere ACORD 25. Máx. 20MB.",
    submit: "Subir PDF",
    uploading: "Subiendo…",
    success: "Recibido — su certificado está en revisión.",
    agentTitle: "Reenviar a mi agente de seguros",
    agentHint:
      "Enviaremos a su agente una solicitud del COI. Usted permanece en la conversación.",
    agentSubmit: "Enviar al agente",
    agentSending: "Enviando…",
    agentOk: "Solicitud enviada a su agente.",
  },
};

export function PortalActions({ token, locale, agentEmail }: Props) {
  const t = copy[locale];
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [agent, setAgent] = useState(agentEmail ?? "");
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentMsg, setAgentMsg] = useState<string | null>(null);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/portal/${token}/upload`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setMsg(data.error ?? "Upload failed");
        return;
      }
      setMsg(t.success);
      setFile(null);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAgent(e: React.FormEvent) {
    e.preventDefault();
    setAgentBusy(true);
    setAgentMsg(null);
    try {
      const res = await fetch(`/api/portal/${token}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentEmail: agent }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setAgentMsg(data.error ?? "Failed");
        return;
      }
      setAgentMsg(t.agentOk);
    } catch (err) {
      setAgentMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setAgentBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onUpload} className="space-y-3 rounded-lg border p-4">
        <div>
          <h2 className="text-sm font-medium">{t.uploadTitle}</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">{t.uploadHint}</p>
        </div>
        <Input
          type="file"
          accept="application/pdf,.pdf"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button type="submit" className="w-full" disabled={busy || !file}>
          {busy ? t.uploading : t.submit}
        </Button>
        {msg ? (
          <p className="text-muted-foreground text-xs leading-relaxed">{msg}</p>
        ) : null}
      </form>

      <form onSubmit={onAgent} className="space-y-3 rounded-lg border p-4">
        <div>
          <h2 className="text-sm font-medium">{t.agentTitle}</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">{t.agentHint}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agent">
            {locale === "es" ? "Email del agente" : "Agent email"}
          </Label>
          <Input
            id="agent"
            type="email"
            required
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            placeholder="agent@agency.com"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={agentBusy}
        >
          {agentBusy ? t.agentSending : t.agentSubmit}
        </Button>
        {agentMsg ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {agentMsg}
          </p>
        ) : null}
      </form>
    </div>
  );
}
