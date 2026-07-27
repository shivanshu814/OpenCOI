"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RequirementRule } from "@/lib/requirements/engine";
import { formatUsd } from "@/lib/ui/format";
import type { ProjectStatus } from "@/lib/projects/types";
import {
  notifyApiError,
  notifyCaughtError,
  notifySuccess,
} from "@/lib/ui/toast";
import { projectEditorFormSchema } from "@/lib/validation/schemas";
import { useZodForm } from "@/lib/validation/use-zod-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FolderKanban } from "lucide-react";

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
  /**
   * False for Read-only members. PATCH /api/projects/[id] enforces the same
   * rule — this only stops them filling in a form that would 403 on submit.
   */
  canEdit: boolean;
};

const STATUS_ITEMS: ReadonlyArray<{ label: string; value: ProjectStatus }> = [
  { label: "Active", value: "active" },
  { label: "Closeout", value: "closeout" },
  { label: "Closed", value: "closed" },
];

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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-destructive text-xs" role="alert">
      {message}
    </p>
  );
}

export function ProjectEditor({
  projectId,
  initial,
  rules,
  vendorIds,
  vendors,
  canEdit,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set(vendorIds));
  const [glMin, setGlMin] = useState(() => {
    const r = rules.find((x) => x.id === "gl_each_occ");
    return String(r?.min_amount ?? 2_000_000);
  });
  const [busy, setBusy] = useState(false);

  const validation = useZodForm(projectEditorFormSchema, {
    name: form.name,
    start_date: form.start_date,
    end_date: form.end_date,
    status: form.status,
    certificate_holder_name: form.certificate_holder_name,
    additional_insured_wording: form.additional_insured_wording,
    notes: form.notes,
    gl_min_amount: glMin,
  });

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
    validation.markSubmitted();
    if (!canEdit || !validation.valid) return;
    setBusy(true);
    try {
      const min = Number(glMin.replace(/,/g, ""));
      const nextRules: RequirementRule[] = rules.length
        ? rules.map((r) =>
            r.id === "gl_each_occ" && Number.isFinite(min)
              ? {
                  ...r,
                  min_amount: min,
                  label: `GL each-occurrence ≥ ${formatUsd(min)} (project)`,
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
              label: `GL each-occurrence ≥ ${formatUsd(Number.isFinite(min) ? min : 2_000_000)} (project)`,
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
        notifyApiError(data, "Could not save project");
        return;
      }
      notifySuccess("Project saved");
      router.refresh();
    } catch (err) {
      notifyCaughtError(err, "Could not save project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-6">
      {!canEdit ? (
        <Alert>
          <AlertDescription>
            Read-only role — job details, certificate-holder wording, and
            requirement overrides are managed by a Manager or Admin.
          </AlertDescription>
        </Alert>
      ) : null}

      <fieldset
        disabled={!canEdit}
        className="m-0 min-w-0 space-y-6 border-0 p-0"
      >
      <section className="space-y-4">
        <SectionHeading title="Project details" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              required
              value={form.name}
              aria-invalid={Boolean(validation.errorFor("name")) || undefined}
              onBlur={() => validation.markTouched("name")}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <FieldError message={validation.errorFor("name")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="start">Start date</FieldLabel>
            <DatePicker
              id="start"
              placeholder="Start date"
              value={form.start_date}
              onChange={(iso) => {
                validation.markTouched("start_date");
                setForm({ ...form, start_date: iso });
              }}
            />
            <FieldError message={validation.errorFor("start_date")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="end">End date</FieldLabel>
            <DatePicker
              id="end"
              placeholder="End date"
              value={form.end_date}
              onChange={(iso) => {
                validation.markTouched("end_date");
                setForm({ ...form, end_date: iso });
              }}
            />
            <FieldError message={validation.errorFor("end_date")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <Select
              items={STATUS_ITEMS}
              value={form.status}
              onValueChange={(value) => {
                if (value) setForm({ ...form, status: value });
              }}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ITEMS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <Textarea
              id="notes"
              rows={2}
              value={form.notes}
              aria-invalid={Boolean(validation.errorFor("notes")) || undefined}
              onBlur={() => validation.markTouched("notes")}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <FieldError message={validation.errorFor("notes")} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 border-t pt-6">
        <SectionHeading
          title="Certificate holder & wording"
          hint="What must appear on every sub's COI for this job."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="holder">Certificate holder (job)</FieldLabel>
            <Input
              id="holder"
              value={form.certificate_holder_name}
              aria-invalid={
                Boolean(validation.errorFor("certificate_holder_name")) ||
                undefined
              }
              onBlur={() => validation.markTouched("certificate_holder_name")}
              onChange={(e) =>
                setForm({ ...form, certificate_holder_name: e.target.value })
              }
            />
            <FieldError
              message={validation.errorFor("certificate_holder_name")}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="ai">Additional insured wording</FieldLabel>
            <Textarea
              id="ai"
              rows={3}
              value={form.additional_insured_wording}
              aria-invalid={
                Boolean(validation.errorFor("additional_insured_wording")) ||
                undefined
              }
              onBlur={() =>
                validation.markTouched("additional_insured_wording")
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  additional_insured_wording: e.target.value,
                })
              }
            />
            <FieldError
              message={validation.errorFor("additional_insured_wording")}
            />
          </Field>
        </div>
      </section>

      <Card className="gap-0 py-0">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold">
            Project requirement override
          </CardTitle>
          <CardDescription className="text-xs">
            Wins over global, trade, and property rules for documents tied to
            this project (D2 higher job limits).
          </CardDescription>
        </CardHeader>
        <CardContent className="border-t py-4">
          <Field className="max-w-xs">
            <FieldLabel htmlFor="gl">GL each-occurrence minimum ($)</FieldLabel>
            <Input
              id="gl"
              className="tabular-nums"
              value={glMin}
              aria-invalid={
                Boolean(validation.errorFor("gl_min_amount")) || undefined
              }
              onBlur={() => validation.markTouched("gl_min_amount")}
              onChange={(e) => setGlMin(e.target.value)}
            />
            <FieldError message={validation.errorFor("gl_min_amount")} />
          </Field>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold">
            Subs on this project
          </CardTitle>
          <CardDescription className="text-xs">
            Checked subs are tracked against this job’s requirements.
          </CardDescription>
          <CardAction className="text-muted-foreground self-center text-xs tabular-nums">
            {selected.size}/{vendors.length}
          </CardAction>
        </CardHeader>
        <CardContent className="divide-y border-t px-0">
          {vendors.map((v) => (
            <label
              key={v.id}
              htmlFor={`pv-${v.id}`}
              className="hover:bg-muted/40 flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm"
            >
              <Checkbox
                id={`pv-${v.id}`}
                checked={selected.has(v.id)}
                onCheckedChange={() => toggleVendor(v.id)}
              />
              {v.name}
            </label>
          ))}
          {vendors.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              No vendors yet — add vendors first, then attach them as subs.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          pending={busy}
          pendingIcon={FolderKanban}
          disabled={busy || !validation.valid}
        >
          {busy ? "Saving…" : "Save project"}
        </Button>
      </div>
      </fieldset>
    </form>
  );
}
