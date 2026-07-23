"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, CircleAlert, FileText, Upload } from "lucide-react";
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
    choose: "Tap to choose a PDF",
    submit: "Upload PDF",
    uploading: "Uploading…",
    success: "Received — your certificate is in review.",
    or: "or",
    agentTitle: "Forward to my insurance agent",
    agentHint:
      "We’ll email your agent a request to send the COI. You stay on the thread.",
    agentLabel: "Agent email",
    agentSubmit: "Send to agent",
    agentSending: "Sending…",
    agentOk: "Request sent to your agent.",
  },
  es: {
    uploadTitle: "Suba su COI (PDF)",
    uploadHint: "Se prefiere ACORD 25. Máx. 20MB.",
    choose: "Toque para elegir un PDF",
    submit: "Subir PDF",
    uploading: "Subiendo…",
    success: "Recibido — su certificado está en revisión.",
    or: "o",
    agentTitle: "Reenviar a mi agente de seguros",
    agentHint:
      "Enviaremos a su agente una solicitud del COI. Usted permanece en la conversación.",
    agentLabel: "Email del agente",
    agentSubmit: "Enviar al agente",
    agentSending: "Enviando…",
    agentOk: "Solicitud enviada a su agente.",
  },
};

function StatusLine({ text, ok }: { text: string; ok: boolean }) {
  const Icon = ok ? CheckCircle2 : CircleAlert;
  return (
    <p
      className={`flex items-start gap-2 text-sm leading-relaxed ${
        ok ? "text-emerald-700" : "text-red-700"
      }`}
      role="status"
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  );
}

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
    <div className="space-y-6">
      <form onSubmit={onUpload} className="bg-card rounded-xl border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{t.uploadTitle}</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">{t.uploadHint}</p>
        </div>
        <div className="space-y-3 px-4 py-4">
          <label
            htmlFor="coi-file"
            className="border-input hover:bg-accent/50 flex min-h-20 cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-dashed px-4 py-5 text-center"
          >
            {file ? (
              <>
                <FileText
                  className="size-5 shrink-0 text-emerald-600"
                  aria-hidden
                />
                <span className="min-w-0 truncate text-sm font-medium">
                  {file.name}
                </span>
              </>
            ) : (
              <>
                <Upload
                  className="text-muted-foreground size-5 shrink-0"
                  aria-hidden
                />
                <span className="text-muted-foreground text-sm">
                  {t.choose}
                </span>
              </>
            )}
          </label>
          <Input
            id="coi-file"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="submit"
            className="h-12 w-full text-base"
            disabled={busy || !file}
          >
            {busy ? t.uploading : t.submit}
          </Button>
          {msg ? <StatusLine text={msg} ok={msg === t.success} /> : null}
        </div>
      </form>

      <div
        className="text-muted-foreground flex items-center gap-3 text-xs uppercase tracking-wide"
        aria-hidden
      >
        <span className="bg-border h-px flex-1" />
        {t.or}
        <span className="bg-border h-px flex-1" />
      </div>

      <form onSubmit={onAgent} className="bg-card rounded-xl border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{t.agentTitle}</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">{t.agentHint}</p>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="agent">{t.agentLabel}</Label>
            <Input
              id="agent"
              type="email"
              required
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              placeholder="agent@agency.com"
              className="h-11"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="h-12 w-full text-base"
            disabled={agentBusy}
          >
            {agentBusy ? t.agentSending : t.agentSubmit}
          </Button>
          {agentMsg ? (
            <StatusLine text={agentMsg} ok={agentMsg === t.agentOk} />
          ) : null}
        </div>
      </form>
    </div>
  );
}
