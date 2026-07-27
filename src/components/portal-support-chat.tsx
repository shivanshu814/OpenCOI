"use client";

import { CardLiveAccent, LiveBadge } from "@/components/live-activity";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CircleAlert, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ChatTurn = { role: "vendor" | "assistant"; content: string };

type Props = {
  token: string;
  locale: "en" | "es";
  /** Prior turns for this vendor, oldest first. */
  initialTurns: ChatTurn[];
  /** Question chips derived from the vendor's real published findings. */
  suggestions: string[];
  /** False when OPENROUTER_API_KEY is absent — render an honest fallback. */
  enabled: boolean;
};

const copy = {
  en: {
    title: "Ask about your requirements",
    description:
      "Instant answers on what a finding means and what to send next. Answers come from your property manager’s requirements and your published review only.",
    empty: "Ask anything about the list above.",
    placeholder: "e.g. What is a CG 20 10 endorsement?",
    send: "Send",
    sending: "Thinking…",
    you: "You",
    assistant: "CertShield assistant",
    disclaimer:
      "Document review assistance — not legal, insurance, or professional advice. Your property manager makes the final decision.",
    human: "Need a person? Reply to the email from your property manager.",
    offline:
      "Support chat is unavailable right now. Reply to the email from your property manager and a person will help you.",
  },
  es: {
    title: "Pregunte sobre sus requisitos",
    description:
      "Respuestas al instante sobre qué significa cada hallazgo y qué enviar. Solo se responden con los requisitos de su administrador y su revisión publicada.",
    empty: "Pregunte lo que sea sobre la lista de arriba.",
    placeholder: "ej. ¿Qué es un endoso CG 20 10?",
    send: "Enviar",
    sending: "Pensando…",
    you: "Usted",
    assistant: "Asistente de CertShield",
    disclaimer:
      "Asistencia para revisión de documentos — no es asesoría legal, de seguros ni profesional. Su administrador toma la decisión final.",
    human:
      "¿Necesita hablar con una persona? Responda al correo de su administrador de propiedades.",
    offline:
      "El chat de soporte no está disponible en este momento. Responda al correo de su administrador de propiedades.",
  },
};

export function PortalSupportChat({
  token,
  locale,
  initialTurns,
  suggestions,
  enabled,
}: Props) {
  const t = copy[locale];
  const [turns, setTurns] = useState<ChatTurn[]>(initialTurns);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sentCount = useRef(0);

  useEffect(() => {
    // Only autoscroll on turns this session added — never yank the page on
    // first paint, when the vendor still needs to read the gap list above.
    if (sentCount.current === 0) return;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    sentCount.current += 1;
    setTurns((prev) => [...prev, { role: "vendor", content: question }]);
    setDraft("");
    setError(null);
    setBusy(true);

    try {
      const res = await fetch(`/api/portal/${token}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok || !data.answer) {
        setError(data.error ?? t.offline);
        return;
      }
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: data.answer! },
      ]);
    } catch {
      setError(t.offline);
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <Card className="gap-0 overflow-hidden py-0">
        <CardLiveAccent />
        <CardHeader className="border-b py-3 [.border-b]:pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="text-brand size-4" aria-hidden />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t.offline}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardLiveAccent />
      <CardHeader className="border-b py-3 [.border-b]:pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="text-brand size-4" aria-hidden />
            {t.title}
          </CardTitle>
          <LiveBadge label="Assistant" tone="brand" />
        </div>
        <CardDescription className="text-xs leading-relaxed">
          {t.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 py-4">
        <div
          ref={listRef}
          className="bg-muted/30 max-h-80 space-y-3 overflow-y-auto rounded-lg border p-3"
          aria-live="polite"
          aria-busy={busy}
        >
          {turns.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t.empty}</p>
          ) : (
            turns.map((turn, i) => (
              <div
                key={`${i}-${turn.role}`}
                className={
                  turn.role === "vendor"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div className="max-w-[min(100%,28rem)] space-y-1">
                  <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                    {turn.role === "vendor" ? t.you : t.assistant}
                  </p>
                  <div
                    className={`rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      turn.role === "vendor"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border shadow-xs"
                    }`}
                  >
                    {turn.content}
                  </div>
                </div>
              </div>
            ))
          )}
          {busy ? (
            <p className="text-muted-foreground text-sm">{t.sending}</p>
          ) : null}
        </div>

        {turns.length === 0 && suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                disabled={busy}
                className="border-border bg-card hover:bg-muted disabled:opacity-50 rounded-lg border px-3 py-2 text-left text-xs leading-snug shadow-xs transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter is a newline. Vendors answer this on a
              // phone between jobs — one thumb, no submit hunting.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            placeholder={t.placeholder}
            rows={2}
            maxLength={800}
            className="min-h-16 flex-1 text-base sm:text-sm"
            aria-label={t.title}
          />
          <Button
            type="submit"
            className="h-11 shrink-0 sm:w-28"
            disabled={busy || draft.trim().length === 0}
          >
            <Send className="size-4" aria-hidden />
            {busy ? t.sending : t.send}
          </Button>
        </form>

        {error ? (
          <Alert variant="destructive" role="status">
            <CircleAlert aria-hidden />
            <AlertTitle className="font-normal leading-relaxed">
              {error}
            </AlertTitle>
          </Alert>
        ) : null}

        <div className="text-muted-foreground space-y-1 text-xs leading-relaxed">
          <p>{t.disclaimer}</p>
          <p>{t.human}</p>
        </div>
      </CardContent>
    </Card>
  );
}
