import { RoleGate } from "@/components/role-gate";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/ui/format";
import { Check, Clock, MailCheck, X } from "lucide-react";
import { RequestAgentConfirmButton } from "./request-agent-confirm";

type ConfirmationRow = {
  id: string;
  status: "pending" | "confirmed" | "denied" | "expired" | "revoked";
  producer_email: string;
  producer_name: string | null;
  response_note: string | null;
  responded_at: string | null;
  expires_at: string;
  created_at: string;
};

const STATUS_UI: Record<
  ConfirmationRow["status"],
  { label: string; className: string; Icon: typeof Check }
> = {
  confirmed: {
    label: "Agent confirmed coverage",
    className: "status-surface status-ok",
    Icon: Check,
  },
  denied: {
    label: "Agent denied coverage",
    className: "status-surface status-bad",
    Icon: X,
  },
  pending: {
    label: "Waiting on the agent",
    className: "status-surface status-warn",
    Icon: Clock,
  },
  expired: {
    label: "Confirmation link expired",
    className: "status-surface status-neutral",
    Icon: Clock,
  },
  revoked: {
    label: "Confirmation revoked",
    className: "status-surface status-neutral",
    Icon: X,
  },
};

/**
 * B8 agent confirmation — request *and* result.
 *
 * The request button used to be write-only: the producer clicked Confirm or
 * Deny in their email, the row flipped, and the customer saw nothing at all.
 * An answer that only exists in the audit trail is not an answer, so the
 * outcome now renders here and updates live (agent_confirmations is in the
 * Realtime publication as of migration 024).
 *
 * A confirmation is an agent's statement, not a verdict: it never changes the
 * compliance result on its own, and the customer stays the final approver.
 */
export async function AgentConfirmationPanel({
  documentId,
}: {
  documentId: string;
}) {
  let rows: ConfirmationRow[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("agent_confirmations")
      .select(
        "id, status, producer_email, producer_name, response_note, responded_at, expires_at, created_at",
      )
      .eq("document_id", documentId)
      .order("created_at", { ascending: false })
      .limit(5);
    rows = (data ?? []) as ConfirmationRow[];
  }

  const latest = rows[0] ?? null;
  const answered =
    latest?.status === "confirmed" || latest?.status === "denied";
  const ui = latest ? STATUS_UI[latest.status] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailCheck className="text-muted-foreground size-4" aria-hidden />
          Agent confirmation (B8)
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Emails the producer: Confirm / Deny that this cert is valid &amp;
          current. Mitigates mid-term cancellations — does not detect them
          automatically.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {latest && ui ? (
          <Alert className={ui.className}>
            <ui.Icon className="size-4" aria-hidden />
            <AlertTitle className="text-sm">{ui.label}</AlertTitle>
            <AlertDescription className="space-y-1 text-xs leading-relaxed">
              <p>
                {latest.producer_name
                  ? `${latest.producer_name} · ${latest.producer_email}`
                  : latest.producer_email}
              </p>
              <p className="text-muted-foreground">
                {answered && latest.responded_at
                  ? `Answered ${formatDateTime(latest.responded_at)}`
                  : latest.status === "pending"
                    ? `Sent ${formatDateTime(latest.created_at)} · link valid until ${formatDateTime(latest.expires_at)}`
                    : `Requested ${formatDateTime(latest.created_at)}`}
              </p>
              {latest.response_note ? (
                <p className="text-foreground pt-1">
                  “{latest.response_note}”
                </p>
              ) : null}
              {answered ? (
                <p className="text-muted-foreground pt-1">
                  An agent&apos;s answer is evidence for your file — it does not
                  change the verdict by itself. You remain the final approver.
                </p>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-muted-foreground text-xs leading-relaxed">
            No confirmation requested for this certificate yet.
          </p>
        )}

        {rows.length > 1 ? (
          <ul className="space-y-1 border-t pt-3">
            <li className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Earlier requests
            </li>
            {rows.slice(1).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-2 text-xs"
              >
                <Badge variant="secondary">{STATUS_UI[r.status].label}</Badge>
                <span className="text-muted-foreground">
                  {formatDateTime(r.responded_at ?? r.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <RoleGate
          require="write"
          fallback={
            <p className="text-muted-foreground text-xs">
              Read-only role — a manager or admin can request confirmation.
            </p>
          }
        >
          <RequestAgentConfirmButton
            documentId={documentId}
            hasPending={latest?.status === "pending"}
          />
        </RoleGate>
      </CardContent>
    </Card>
  );
}
