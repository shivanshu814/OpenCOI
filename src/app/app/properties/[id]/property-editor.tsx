"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RequirementRule } from "@/lib/requirements/engine";
import { useRouter } from "next/navigation";
import { useState } from "react";

type VendorOpt = { id: string; name: string };

type Props = {
  propertyId: string;
  initial: {
    name: string;
    address_line: string;
    city: string;
    state: string;
    postal_code: string;
    certificate_holder_name: string;
    additional_insured_wording: string;
    owner_llc_names: string;
    lender_names: string;
  };
  rules: RequirementRule[];
  vendorIds: string[];
  vendors: VendorOpt[];
};

export function PropertyEditor({
  propertyId,
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
    return String(r?.min_amount ?? 1_000_000);
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
                  label: `GL each-occurrence ≥ $${min.toLocaleString()}`,
                }
              : r,
          )
        : [
            {
              id: "gl_each_occ",
              line: "general_liability",
              limit_name: "each_occurrence",
              min_amount: Number.isFinite(min) ? min : 1_000_000,
              check_expiration: true,
              label: `GL each-occurrence ≥ $${(Number.isFinite(min) ? min : 1_000_000).toLocaleString()}`,
            },
          ];

      const res = await fetch(`/api/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          address_line: form.address_line || null,
          city: form.city || null,
          state: form.state || null,
          postal_code: form.postal_code || null,
          certificate_holder_name: form.certificate_holder_name || null,
          additional_insured_wording: form.additional_insured_wording || null,
          owner_llc_names: form.owner_llc_names
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          lender_names: form.lender_names
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
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
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="addr">Address</Label>
          <Input
            id="addr"
            value={form.address_line}
            onChange={(e) => setForm({ ...form, address_line: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              maxLength={2}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zip">ZIP</Label>
            <Input
              id="zip"
              value={form.postal_code}
              onChange={(e) =>
                setForm({ ...form, postal_code: e.target.value })
              }
            />
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="holder">Certificate holder name</Label>
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
            placeholder="…including Oak Street LLC as additional insured…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="llcs">Owner LLCs (comma-separated)</Label>
          <Input
            id="llcs"
            value={form.owner_llc_names}
            onChange={(e) =>
              setForm({ ...form, owner_llc_names: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lenders">Lenders (comma-separated)</Label>
          <Input
            id="lenders"
            value={form.lender_names}
            onChange={(e) => setForm({ ...form, lender_names: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Requirement override</h2>
        <p className="text-muted-foreground text-xs">
          Merges over global + trade rules for documents tied to this property.
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
        <h2 className="text-sm font-medium">Vendors on this property</h2>
        <ul className="space-y-2">
          {vendors.map((v) => (
            <li key={v.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(v.id)}
                onChange={() => toggleVendor(v.id)}
                id={`v-${v.id}`}
              />
              <label htmlFor={`v-${v.id}`}>{v.name}</label>
            </li>
          ))}
          {vendors.length === 0 ? (
            <li className="text-muted-foreground text-xs">No vendors yet.</li>
          ) : null}
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save property"}
        </Button>
        {msg ? <p className="text-muted-foreground text-xs">{msg}</p> : null}
      </div>
    </form>
  );
}
