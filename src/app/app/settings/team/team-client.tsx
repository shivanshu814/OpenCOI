"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { productRoleLabel, toProductRole } from "@/lib/auth/roles";
import { useEffect, useState } from "react";

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
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
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
      setMsg(data.error);
      return;
    }
    setMembers(data.members ?? []);
    setInvites(data.invites ?? []);
    setFromEmail(data.branding?.from_email ?? "");
    setReplyTo(data.branding?.reply_to_email ?? "");
    setColor(data.branding?.brand_primary_color ?? "");
    setLogo(data.branding?.logo_url ?? "");
  }

  useEffect(() => {
    void load();
  }, []);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; note?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Failed");
        return;
      }
      setMsg(data.note ?? "Saved");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">
          Team (Admin / Manager / Read-only)
        </h2>
        <p className="text-muted-foreground text-xs">
          DB roles map to product: owner/admin → Admin, member → Manager, viewer
          → Read-only.
        </p>
        <ul className="divide-y rounded border text-sm">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
            >
              <span className="font-mono text-xs">
                {m.user_id.slice(0, 8)}…
              </span>
              <span className="text-xs">
                {productRoleLabel(toProductRole(m.role))} ({m.role})
              </span>
            </li>
          ))}
          {members.length === 0 ? (
            <li className="text-muted-foreground px-3 py-4 text-xs">
              No members loaded (or demo).
            </li>
          ) : null}
        </ul>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="invite-email">Invite email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "admin" | "member" | "viewer")
              }
            >
              <option value="admin">Admin</option>
              <option value="member">Manager</option>
              <option value="viewer">Read-only</option>
            </select>
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
          <ul className="text-muted-foreground text-xs">
            {invites.map((i) => (
              <li key={i.id}>
                Pending: {i.email} · {i.role}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">White-label email (F2)</h2>
        <p className="text-muted-foreground text-xs">
          Custom from-address requires DKIM on your domain in Resend.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="from">From email</Label>
            <Input
              id="from"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="compliance@yourpm.com"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reply">Reply-to</Label>
            <Input
              id="reply"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="color">Brand color</Label>
            <Input
              id="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#0F766E"
            />
          </div>
          <div className="space-y-1">
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
      </section>

      {msg ? <p className="text-muted-foreground text-xs">{msg}</p> : null}
    </div>
  );
}
