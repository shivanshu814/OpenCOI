"use client";

import {
  CardLiveAccent,
  LiveBadge,
  LiveCount,
} from "@/components/live-activity";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { productRoleLabel, toProductRole } from "@/lib/auth/roles";
import {
  notifyApiError,
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/lib/ui/toast";
import { cn } from "@/lib/utils";
import { Building2, Mail, MessageSquare, Palette } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const ROLE_ITEMS: ReadonlyArray<{
  label: string;
  value: "admin" | "member" | "viewer";
}> = [
  { label: "Admin", value: "admin" },
  { label: "Manager", value: "member" },
  { label: "Read-only", value: "viewer" },
];

/** US zones only — CertShield stores and reports in US regions (spec §0). */
const TIMEZONE_ITEMS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "Eastern (New York)", value: "America/New_York" },
  { label: "Central (Chicago)", value: "America/Chicago" },
  { label: "Mountain (Denver)", value: "America/Denver" },
  { label: "Arizona (Phoenix)", value: "America/Phoenix" },
  { label: "Pacific (Los Angeles)", value: "America/Los_Angeles" },
  { label: "Alaska (Anchorage)", value: "America/Anchorage" },
  { label: "Hawaii (Honolulu)", value: "Pacific/Honolulu" },
];

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

type OrgSettings = {
  name: string;
  legal_name: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  website: string;
  timezone: string;
  from_email: string;
  reply_to_email: string;
  brand_primary_color: string;
  logo_url: string;
  chase_notify_email: string;
  digest_email: string;
  digest_enabled: boolean;
  notify_email_enabled: boolean;
  notify_sms_enabled: boolean;
};

const EMPTY_SETTINGS: OrgSettings = {
  name: "",
  legal_name: "",
  address_line: "",
  city: "",
  state: "",
  postal_code: "",
  phone: "",
  website: "",
  timezone: "",
  from_email: "",
  reply_to_email: "",
  brand_primary_color: "",
  logo_url: "",
  chase_notify_email: "",
  digest_email: "",
  digest_enabled: true,
  notify_email_enabled: true,
  notify_sms_enabled: false,
};

function SectionTitle({
  icon: Icon,
  title,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
      <span className="bg-brand-muted text-brand flex size-6 items-center justify-center rounded-md">
        <Icon className="size-3.5" />
      </span>
      {title}
      {badge}
    </CardTitle>
  );
}

export function TeamSettingsClient() {
  const [members, setMembers] = useState<
    { id: string; user_id: string; role: string }[]
  >([]);
  const [invites, setInvites] = useState<
    { id: string; email: string; role: string }[]
  >([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [settings, setSettings] = useState<OrgSettings>(EMPTY_SETTINGS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const set = useCallback(
    <K extends keyof OrgSettings>(key: K, value: OrgSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/settings/team");
    const data = (await res.json()) as {
      members?: { id: string; user_id: string; role: string }[];
      invites?: { id: string; email: string; role: string }[];
      branding?: Partial<Record<keyof OrgSettings, unknown>>;
      error?: string;
    };
    if (data.error) {
      setLoadError(data.error);
      notifyError(data.error);
      setLoading(false);
      return;
    }
    setLoadError(null);
    setMembers(data.members ?? []);
    setInvites(data.invites ?? []);

    const org = data.branding ?? {};
    setSettings({
      ...EMPTY_SETTINGS,
      ...Object.fromEntries(
        Object.keys(EMPTY_SETTINGS).map((key) => {
          const k = key as keyof OrgSettings;
          const value = org[k];
          if (typeof EMPTY_SETTINGS[k] === "boolean") {
            return [k, value === undefined ? EMPTY_SETTINGS[k] : Boolean(value)];
          }
          return [k, typeof value === "string" ? value : ""];
        }),
      ),
    } as OrgSettings);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(body: Record<string, unknown>, successMessage: string) {
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
      if (data.note) notifyWarning(data.note);
      else notifySuccess(successMessage);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const colorValid =
    !settings.brand_primary_color || HEX_RE.test(settings.brand_primary_color);
  const logoValid =
    !settings.logo_url || /^https:\/\//i.test(settings.logo_url.trim());

  if (loading) {
    return (
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Company profile ───────────────────────────────────────────── */}
      <Card className="gap-0 overflow-hidden py-0">
        <CardLiveAccent />
        <CardHeader className="border-b pt-4">
          <SectionTitle
            icon={Building2}
            title="Company profile"
            badge={<LiveBadge label="Org" tone="ok" />}
          />
          <CardDescription className="text-xs">
            Appears on owner reports and vendor-facing emails, so vendors know
            exactly who is asking for their certificate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-4 sm:px-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Company name</Label>
              <Input
                id="org-name"
                value={settings.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Riverside Property Management"
                aria-invalid={!settings.name.trim() || undefined}
              />
              {!settings.name.trim() ? (
                <p className="text-destructive text-xs">
                  A company name is required — it appears on every report.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-legal">Legal entity name</Label>
              <Input
                id="org-legal"
                value={settings.legal_name}
                onChange={(e) => set("legal_name", e.target.value)}
                placeholder="Riverside PM LLC"
              />
              <p className="text-muted-foreground text-xs">
                Optional. Used where a certificate holder must match your
                entity exactly.
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="org-address">Street address</Label>
              <Input
                id="org-address"
                value={settings.address_line}
                onChange={(e) => set("address_line", e.target.value)}
                placeholder="1200 Market St, Suite 400"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-city">City</Label>
              <Input
                id="org-city"
                value={settings.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Philadelphia"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="org-state">State</Label>
                <Input
                  id="org-state"
                  maxLength={2}
                  value={settings.state}
                  onChange={(e) =>
                    set("state", e.target.value.toUpperCase().slice(0, 2))
                  }
                  placeholder="PA"
                  className="uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-zip">ZIP</Label>
                <Input
                  id="org-zip"
                  value={settings.postal_code}
                  onChange={(e) => set("postal_code", e.target.value)}
                  placeholder="19107"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-phone">Phone</Label>
              <Input
                id="org-phone"
                type="tel"
                value={settings.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(215) 555-0142"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-website">Website</Label>
              <Input
                id="org-website"
                value={settings.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://riversidepm.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-tz">Time zone</Label>
              <Select
                items={TIMEZONE_ITEMS}
                value={settings.timezone || null}
                onValueChange={(value) => set("timezone", value ?? "")}
              >
                <SelectTrigger id="org-tz" className="w-full">
                  <SelectValue placeholder="Select a time zone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_ITEMS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Sets when the daily digest arrives and how dates read on
                reports.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            disabled={busy || !settings.name.trim()}
            onClick={() =>
              void post(
                { action: "update_profile", ...settings },
                "Company profile saved",
              )
            }
          >
            Save company profile
          </Button>
        </CardContent>
      </Card>

      {/* ── Branding ──────────────────────────────────────────────────── */}
      <Card className="gap-0 overflow-hidden py-0">
        <CardLiveAccent />
        <CardHeader className="border-b pt-4">
          <SectionTitle
            icon={Palette}
            title="Branding"
            badge={<LiveBadge label="White-label" tone="info" />}
          />
          <CardDescription className="text-xs">
            Your logo and accent color are applied across this workspace, the
            vendor portal, chase emails, and report PDFs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-4 sm:px-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="color">Accent color</Label>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-9 shrink-0 rounded-md border transition-colors"
                    style={{
                      backgroundColor: colorValid
                        ? settings.brand_primary_color || "var(--brand)"
                        : "var(--muted)",
                    }}
                  />
                  <Input
                    id="color"
                    value={settings.brand_primary_color}
                    onChange={(e) =>
                      set("brand_primary_color", e.target.value)
                    }
                    placeholder="#0F766E"
                    aria-invalid={!colorValid || undefined}
                  />
                </div>
                {!colorValid ? (
                  <p className="text-destructive text-xs">
                    Enter a hex color such as #0F766E.
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="logo">Logo URL</Label>
                <Input
                  id="logo"
                  value={settings.logo_url}
                  onChange={(e) => set("logo_url", e.target.value)}
                  placeholder="https://yourpm.com/logo.png"
                  aria-invalid={!logoValid || undefined}
                />
                {!logoValid ? (
                  <p className="text-destructive text-xs">
                    The logo must be served over https.
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="from">From email</Label>
                <Input
                  id="from"
                  type="email"
                  value={settings.from_email}
                  onChange={(e) => set("from_email", e.target.value)}
                  placeholder="compliance@yourpm.com"
                />
                <p className="text-muted-foreground text-xs">
                  A custom from-address requires DKIM on your domain in Resend.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reply">Reply-to</Label>
                <Input
                  id="reply"
                  type="email"
                  value={settings.reply_to_email}
                  onChange={(e) => set("reply_to_email", e.target.value)}
                  placeholder="you@yourpm.com"
                />
              </div>
            </div>

            {/* Live preview — what a vendor sees */}
            <div className="bg-muted/30 space-y-3 rounded-xl border p-4">
              <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                Vendor sees
              </p>
              <div
                className="bg-card space-y-2.5 rounded-lg border p-3 shadow-xs transition-colors"
                style={
                  colorValid && settings.brand_primary_color
                    ? ({
                        "--brand": settings.brand_primary_color,
                      } as React.CSSProperties)
                    : undefined
                }
              >
                <div className="flex items-center gap-2">
                  {logoValid && settings.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.logo_url}
                      alt=""
                      className="size-6 rounded object-contain"
                    />
                  ) : (
                    <span className="bg-brand size-6 rounded" aria-hidden />
                  )}
                  <span className="truncate text-xs font-semibold">
                    {settings.name || "Your company"}
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Your certificate of insurance expires soon. Upload the
                  renewal — no login required.
                </p>
                <span className="bg-brand text-brand-foreground inline-flex h-7 items-center rounded-md px-2.5 text-[11px] font-medium">
                  Upload renewal
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Illustrative preview of chase-email branding.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={busy || !colorValid || !logoValid}
            onClick={() =>
              void post(
                {
                  action: "update_branding",
                  from_email: settings.from_email,
                  reply_to_email: settings.reply_to_email,
                  brand_primary_color: settings.brand_primary_color,
                  logo_url: settings.logo_url,
                  chase_notify_email: settings.chase_notify_email,
                },
                "Branding saved",
              )
            }
          >
            Save branding
          </Button>
        </CardContent>
      </Card>

      {/* ── Notifications ─────────────────────────────────────────────── */}
      <Card className="gap-0 overflow-hidden py-0">
        <CardLiveAccent />
        <CardHeader className="border-b pt-4">
          <SectionTitle
            icon={Mail}
            title="Notifications"
            badge={<LiveBadge label="Email live" tone="ok" />}
          />
          <CardDescription className="text-xs">
            Where CertShield reaches you when a certificate expires, a check
            fails, or a vendor replies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-4 sm:px-5">
          <ChannelRow
            icon={Mail}
            title="Email"
            description="Compliance alerts, chase replies, and the daily digest."
            control={
              <Switch
                aria-label="Email notifications"
                checked={settings.notify_email_enabled}
                onCheckedChange={(checked) =>
                  set("notify_email_enabled", Boolean(checked))
                }
              />
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="notify-email">Alerts address</Label>
              <Input
                id="notify-email"
                type="email"
                value={settings.chase_notify_email}
                onChange={(e) => set("chase_notify_email", e.target.value)}
                placeholder="compliance@yourpm.com"
                disabled={!settings.notify_email_enabled}
              />
              <p className="text-muted-foreground text-xs">
                Vendor replies and failed checks land here.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="digest-email">Daily digest address</Label>
              <Input
                id="digest-email"
                type="email"
                value={settings.digest_email}
                onChange={(e) => set("digest_email", e.target.value)}
                placeholder="you@yourpm.com"
                disabled={
                  !settings.notify_email_enabled || !settings.digest_enabled
                }
              />
              <div className="flex items-center gap-2 pt-0.5">
                <Switch
                  id="digest-enabled"
                  aria-label="Daily digest"
                  checked={settings.digest_enabled}
                  disabled={!settings.notify_email_enabled}
                  onCheckedChange={(checked) =>
                    set("digest_enabled", Boolean(checked))
                  }
                />
                <Label
                  htmlFor="digest-enabled"
                  className="text-muted-foreground text-xs font-normal"
                >
                  Send one morning summary of what needs attention
                </Label>
              </div>
            </div>
          </div>

          <ChannelRow
            icon={MessageSquare}
            title="SMS"
            description="Text-message chase reminders to vendors who ignore email."
            muted
            control={
              <Badge variant="secondary" className="shrink-0">
                Coming soon
              </Badge>
            }
            footnote="SMS switches on once carrier registration (A2P 10DLC) is approved. Email chase runs today and is unaffected."
          />

          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void post(
                {
                  action: "update_notifications",
                  notify_email_enabled: settings.notify_email_enabled,
                  chase_notify_email: settings.chase_notify_email,
                  digest_email: settings.digest_email,
                  digest_enabled: settings.digest_enabled,
                },
                "Notification settings saved",
              )
            }
          >
            Save notifications
          </Button>
        </CardContent>
      </Card>

      {/* ── Team ──────────────────────────────────────────────────────── */}
      <Card className="gap-0 overflow-hidden py-0">
        <CardLiveAccent />
        <CardHeader className="border-b pt-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            Team members
            <LiveBadge label="Org" tone="ok" />
          </CardTitle>
          <CardDescription className="text-xs">
            Roles map to what each person can do: Admin manages billing and
            settings, Manager uploads and reviews, Read-only can view.
          </CardDescription>
          <CardAction className="self-center">
            <LiveCount value={members.length} />
          </CardAction>
        </CardHeader>

        <ul className="divide-y">
          {members.length > 0 ? (
            <li
              className="text-muted-foreground bg-muted/40 hidden items-center gap-x-3 border-b px-4 py-2 text-[11px] font-medium tracking-wide uppercase sm:grid sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:px-5"
              aria-hidden
            >
              <span>User</span>
              <span>Role</span>
            </li>
          ) : null}
          {members.map((m) => (
            <li
              key={m.id}
              className="hover:bg-muted/40 grid items-center gap-x-3 gap-y-1 px-4 py-2.5 transition-colors sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:px-5"
            >
              <span className="font-mono text-xs">{m.user_id.slice(0, 8)}…</span>
              <span className="text-sm">
                {productRoleLabel(toProductRole(m.role))}{" "}
                <span className="text-muted-foreground text-xs">
                  ({m.role})
                </span>
              </span>
            </li>
          ))}
          {members.length === 0 ? (
            <li className="text-muted-foreground px-4 py-8 text-center text-sm">
              No teammates yet — it&apos;s just you. Invite someone below.
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
            onClick={() =>
              void post(
                { action: "invite", email, role },
                `Invite sent to ${email.trim()}`,
              )
            }
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

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function ChannelRow({
  icon: Icon,
  title,
  description,
  control,
  footnote,
  muted = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  control: React.ReactNode;
  footnote?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3.5",
        muted ? "bg-muted/20 border-dashed" : "bg-card",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            muted ? "bg-muted text-muted-foreground" : "bg-brand-muted text-brand",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {description}
          </p>
          {footnote ? (
            <p className="text-muted-foreground max-w-lg pt-1 text-xs leading-relaxed">
              {footnote}
            </p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </div>
  );
}
