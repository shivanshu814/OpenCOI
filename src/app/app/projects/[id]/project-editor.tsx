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
    <form onSubmit={onSave} className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
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

      <div className="space-y-2 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Project requirement override</h2>
        <p className="text-muted-foreground text-xs">
          Wins over global, trade, and property rules for documents tied to this
          project (D2 higher job limits).
        </p>
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="gl">GL each-occurrence minimum ($)</Label>
          <Input
            id="gl"
            value={glMin}
            onChange={(e) => setGlMin(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Subs on this project</h2>
        <ul className="space-y-2">
          {vendors.map((v) => (
            <li key={v.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(v.id)}
                onChange={() => toggleVendor(v.id)}
                id={`pv-${v.id}`}
              />
              <label htmlFor={`pv-${v.id}`}>{v.name}</label>
            </li>
          ))}
          {vendors.length === 0 ? (
            <li className="text-muted-foreground text-xs">No vendors yet.</li>
          ) : null}
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save project"}
        </Button>
        {msg ? <p className="text-muted-foreground text-xs">{msg}</p> : null}
      </div>
    </form>
  );
}
