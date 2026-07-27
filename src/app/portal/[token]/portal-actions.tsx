"use client";

import { CardLiveAccent } from "@/components/live-activity";
import { SampleCoiPicker } from "@/components/sample-coi-picker";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, CircleAlert, Mail } from "lucide-react";
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
    wrongType:
      "That file is not a PDF. Please upload the certificate as a PDF.",
    tooLarge: (mb: number) =>
      `That file is larger than ${mb} MB. Please upload a smaller scan.`,
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
    wrongType: "Ese archivo no es un PDF. Suba el certificado en formato PDF.",
    tooLarge: (mb: number) =>
      `Ese archivo supera los ${mb} MB. Suba un escaneo más pequeño.`,
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
    <Alert variant={ok ? "default" : "destructive"} role="status">
      <Icon className={ok ? "text-emerald-600" : undefined} aria-hidden />
      <AlertTitle
        className={`font-normal leading-relaxed ${
          ok ? "text-emerald-700" : ""
        }`}
      >
        {text}
      </AlertTitle>
    </Alert>
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
      <form onSubmit={onUpload}>
        <Card className="gap-0 overflow-hidden py-0">
          <CardLiveAccent />
          <CardHeader className="border-b py-3 [.border-b]:pb-3">
            <CardTitle className="text-sm font-semibold">
              {t.uploadTitle}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.uploadHint}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-4">
            <FileDropzone
              id="coi-file"
              value={file}
              onChange={(next) => {
                setFile(next);
                setMsg(null);
              }}
              accept="application/pdf,.pdf"
              maxSizeMb={20}
              onReject={(message) => setMsg(message)}
              messages={{
                wrongType: t.wrongType,
                tooLarge: (mb) => t.tooLarge(mb),
              }}
              label={t.choose}
              hint={t.uploadHint}
            />
            <SampleCoiPicker
              locale={locale}
              onSelect={(sampleFile) => {
                setFile(sampleFile);
                setMsg(null);
              }}
            />
            <Button
              type="submit"
              className="h-11 w-full text-sm font-medium"
              pending={busy}
              pendingGlyph="upload"
              disabled={busy || !file}
            >
              {busy ? t.uploading : t.submit}
            </Button>
            {msg ? <StatusLine text={msg} ok={msg === t.success} /> : null}
          </CardContent>
        </Card>
      </form>

      <div
        className="text-muted-foreground flex items-center gap-3 text-[11px] font-medium tracking-wide uppercase"
        aria-hidden
      >
        <span className="bg-border h-px flex-1" />
        {t.or}
        <span className="bg-border h-px flex-1" />
      </div>

      <form onSubmit={onAgent}>
        <Card className="gap-0 overflow-hidden py-0">
          <CardLiveAccent />
          <CardHeader className="border-b py-3 [.border-b]:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="text-brand size-4" aria-hidden />
              {t.agentTitle}
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              {t.agentHint}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 py-4">
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
              className="h-11 w-full text-sm font-medium"
              disabled={agentBusy}
            >
              {agentBusy ? t.agentSending : t.agentSubmit}
            </Button>
            {agentMsg ? (
              <StatusLine text={agentMsg} ok={agentMsg === t.agentOk} />
            ) : null}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
