"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RequirementRule } from "@/lib/requirements/engine";
import type { ProjectStatus } from "@/lib/projects/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

type VendorOpt = { id: string; name: string };

type Props = {
  projectId: string;
  initial: {
    name: string;
    start_date: string;
    end_date: string;
    status: ProjectStatus;
    certificate_holder_name: string;
    additional_insured_wording: string;
    notes: string;
  };
  rules: RequirementRule[];
  vendorIds: string[];
  vendors: VendorOpt[];
};

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint ? (
        <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

export function ProjectEditor({
  projectId,
  initial,
  rules,
  vendorIds,
  vendors,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set(vendorIds));
  const [glMin, setGlMin] = useState(() => {
    const r = rules.find((x) => x.id === "gl_each_occ");
    return String(r?.min_amount ?? 2_000_000);
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggleVendor(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const min = Number(glMin.replace(/,/g, ""));
      const nextRules: RequirementRule[] = rules.length
        ? rules.map((r) =>
            r.id === "gl_each_occ" && Number.isFinite(min)
              ? {
                  ...r,
                  min_amount: min,
                  label: `GL each-occurrence ≥ $${min.toLocaleString()} (project)`,
                }
              : r,
          )
        : [
            {
              id: "gl_each_occ",
              line: "general_liability",
              limit_name: "each_occurrence",
              min_amount: Number.isFinite(min) ? min : 2_000_000,
              check_expiration: true,
              label: `GL each-occurrence ≥ $${(Number.isFinite(min) ? min : 2_000_000).toLocaleString()} (project)`,
            },
          ];

      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          status: form.status,
          certificate_holder_name: form.certificate_holder_name || null,
          additional_insured_wording: form.additional_insured_wording || null,
          notes: form.notes || null,
          rules: nextRules,
          vendorIds: Array.from(selected),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Save failed");
        return;
      }
      setMsg("Saved");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-8">
      <section className="space-y-4">
        <SectionHeading title="Project details" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="start">Start date</Label>
            <Input
              id="start"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end">End date</Label>
            <Input
              id="end"
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as ProjectStatus,
                })
              }
            >
              <option value="active">Active</option>
              <option value="closeout">Closeout</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t pt-6">
        <SectionHeading
          title="Certificate holder & wording"
          hint="What must appear on every sub's COI for this job."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="holder">Certificate holder (job)</Label>
            <Input
              id="holder"
              value={form.certificate_holder_name}
              onChange={(e) =>
                setForm({ ...form, certificate_holder_name: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ai">Additional insured wording</Label>
            <Textarea
              id="ai"
              rows={3}
              value={form.additional_insured_wording}
              onChange={(e) =>
                setForm({
                  ...form,
                  additional_insured_wording: e.target.value,
                })
              }
            />
          </div>
        </div>
      </section>

      <section className="bg-card rounded-xl border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">
            Project requirement override
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Wins over global, trade, and property rules for documents tied to
            this project (D2 higher job limits).
          </p>
        </div>
        <div className="max-w-xs space-y-1.5 p-4">
          <Label htmlFor="gl">GL each-occurrence minimum ($)</Label>
          <Input
            id="gl"
            className="tabular-nums"
            value={glMin}
            onChange={(e) => setGlMin(e.target.value)}
          />
        </div>
      </section>

      <section className="bg-card rounded-xl border">
        <div className="flex items-baseline justify-between gap-2 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Subs on this project</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Checked subs are tracked against this job’s requirements.
            </p>
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            {selected.size}/{vendors.length}
          </span>
        </div>
        <div className="divide-y">
          {vendors.map((v) => (
            <label
              key={v.id}
              htmlFor={`pv-${v.id}`}
              className="hover:bg-muted/40 flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm"
            >
              <input
                type="checkbox"
                className="accent-primary size-4"
                checked={selected.has(v.id)}
                onChange={() => toggleVendor(v.id)}
                id={`pv-${v.id}`}
              />
              {v.name}
            </label>
          ))}
          {vendors.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              No vendors yet — add vendors first, then attach them as subs.
            </p>
          ) : null}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save project"}
        </Button>
        {msg ? <p className="text-muted-foreground text-xs">{msg}</p> : null}
      </div>
    </form>
  );
}
