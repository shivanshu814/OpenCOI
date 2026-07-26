"use client";

import {
  CardLiveAccent,
  LiveBadge,
  LiveCount,
} from "@/components/live-activity";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productRoleLabel, toProductRole } from "@/lib/auth/roles";
import {
  notifyApiError,
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/lib/ui/toast";
import { useCallback, useEffect, useState } from "react";

const ROLE_ITEMS: ReadonlyArray<{
  label: string;
  value: "admin" | "member" | "viewer";
}> = [
  { label: "Admin", value: "admin" },
  { label: "Manager", value: "member" },
  { label: "Read-only", value: "viewer" },
];

export function TeamSettingsClient() {
  const [members, setMembers] = useState<
    { id: string; user_id: string; role: string }[]
  >([]);
  const [invites, setInvites] = useState<
    { id: string; email: string; role: string }[]
  >([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [color, setColor] = useState("");
  const [logo, setLogo] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings/team");
    const data = (await res.json()) as {
      members?: typeof members;
      invites?: typeof invites;
      branding?: {
        from_email?: string | null;
        reply_to_email?: string | null;
        brand_primary_color?: string | null;
        logo_url?: string | null;
      };
      error?: string;
    };
    if (data.error) {
      setLoadError(data.error);
      notifyError(data.error);
      return;
    }
    setLoadError(null);
    setMembers(data.members ?? []);
    setInvites(data.invites ?? []);
    setFromEmail(data.branding?.from_email ?? "");
    setReplyTo(data.branding?.reply_to_email ?? "");
    setColor(data.branding?.brand_primary_color ?? "");
    setLogo(data.branding?.logo_url ?? "");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/settings/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; note?: string };
      if (!res.ok) {
        notifyApiError(data, "Could not save");
        return;
      }
      if (body.action === "invite") {
        notifySuccess(`Invite sent to ${String(body.email)}`);
      } else if (data.note) {
        notifyWarning(data.note);
      } else {
        notifySuccess("Branding saved");
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="gap-0 overflow-hidden py-0">
        <CardLiveAccent />
        <CardHeader className="border-b pt-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            Team members
            <LiveBadge label="Org" tone="ok" />
          </CardTitle>
          <CardDescription className="text-xs">
            DB roles map to product: owner/admin to Admin, member to Manager,
            viewer to Read-only.
          </CardDescription>
          <CardAction className="self-center">
            <LiveCount value={members.length} />
          </CardAction>
        </CardHeader>

        <ul className="divide-y">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
            >
              <span className="font-mono text-xs">
                {m.user_id.slice(0, 8)}…
              </span>
              <span className="text-sm">
                {productRoleLabel(toProductRole(m.role))}{" "}
                <span className="text-muted-foreground text-xs">
                  ({m.role})
                </span>
              </span>
            </li>
          ))}
          {members.length === 0 ? (
            <li className="text-muted-foreground px-4 py-6 text-center text-sm">
              No members loaded (or demo).
            </li>
          ) : null}
        </ul>

        <CardFooter className="flex-col items-start gap-3 sm:px-5">
          <p className="text-xs font-medium">Invite a teammate</p>
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="invite-email">Invite email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@yourpm.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                items={ROLE_ITEMS}
                value={role}
                onValueChange={(value) => {
                  if (value) setRole(value);
                }}
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_ITEMS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            size="sm"
            disabled={busy || !email.trim()}
            onClick={() => void post({ action: "invite", email, role })}
          >
            Invite
          </Button>
          {invites.length ? (
            <ul className="text-muted-foreground space-y-0.5 text-xs">
              {invites.map((i) => (
                <li key={i.id}>
                  Pending: {i.email} · {i.role}
                </li>
              ))}
            </ul>
          ) : null}
        </CardFooter>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <CardLiveAccent />
        <CardHeader className="border-b pt-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            White-label email (F2)
            <LiveBadge label="Live" />
          </CardTitle>
          <CardDescription className="text-xs">
            Chase emails go out under your name. Custom from-address requires
            DKIM on your domain in Resend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-4 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="from">From email</Label>
              <Input
                id="from"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="compliance@yourpm.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reply">Reply-to</Label>
              <Input
                id="reply"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color">Brand color</Label>
              <Input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#0F766E"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void post({
                action: "update_branding",
                from_email: fromEmail,
                reply_to_email: replyTo,
                brand_primary_color: color,
                logo_url: logo,
              })
            }
          >
            Save branding
          </Button>
        </CardContent>
      </Card>

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
