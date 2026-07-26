import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LiveBadge } from "@/components/live-activity";
import { formatDateTime } from "@/lib/ui/format";

export type TranscriptRow = {
  role: "vendor" | "assistant";
  content: string;
  created_at: string;
};

/**
 * F4 — what the portal assistant actually told this vendor.
 *
 * The customer stays the accountable party for everything a vendor is told on
 * their behalf, so the transcript is visible here rather than only in the
 * database. Read-only by design: the rows back the audit trail, and a
 * transcript that could be edited afterwards would be worth nothing in a
 * dispute.
 */
export function SupportChatTranscript({ rows }: { rows: TranscriptRow[] }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-4">
        <CardTitle className="flex items-center gap-2">
          Portal support chat
          <LiveBadge label="AI" tone="info" />
        </CardTitle>
        <CardDescription className="text-xs">
          What the assistant answered on this vendor’s portal. Read-only.
        </CardDescription>
        {rows.length > 0 ? (
          <CardAction className="text-muted-foreground self-center text-xs tabular-nums">
            {rows.length}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="py-4">
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            This vendor hasn’t asked the portal assistant anything yet.
          </p>
        ) : (
          <ol className="space-y-3">
            {rows.map((row, i) => (
              <li key={`${row.created_at}-${i}`} className="space-y-1">
                <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
                  {row.role === "vendor" ? "Vendor" : "Assistant"} ·{" "}
                  {formatDateTime(row.created_at)}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {row.content}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
