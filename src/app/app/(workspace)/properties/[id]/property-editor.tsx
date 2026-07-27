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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UsAddressFields } from "@/components/ui/us-address-fields";
import type { RequirementRule } from "@/lib/requirements/engine";
import { formatUsd } from "@/lib/ui/format";
import {
  notifyApiError,
  notifyCaughtError,
  notifySuccess,
} from "@/lib/ui/toast";
import { propertyEditorFormSchema } from "@/lib/validation/schemas";
import { useZodForm } from "@/lib/validation/use-zod-form";
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
    owner_report_email: string;
    owner_report_enabled: boolean;
  };
  rules: RequirementRule[];
  vendorIds: string[];
  vendors: VendorOpt[];
  /**
   * False for Read-only members. PATCH /api/properties/[id] enforces the same
   * rule — this only stops them filling in a form that would 403 on submit.
   */
  canEdit: boolean;
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-destructive text-xs" role="alert">
      {message}
    </p>
  );
}

export function PropertyEditor({
  propertyId,
  initial,
  rules,
  vendorIds,
  vendors,
  canEdit,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [ownerReportEnabled, setOwnerReportEnabled] = useState(
    initial.owner_report_enabled,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set(vendorIds));
  const [glMin, setGlMin] = useState(() => {
    const r = rules.find((x) => x.id === "gl_each_occ");
    return String(r?.min_amount ?? 1_000_000);
  });
  const [busy, setBusy] = useState(false);

  const validation = useZodForm(propertyEditorFormSchema, {
    name: form.name,
    address_line: form.address_line,
    city: form.city,
    state: form.state,
    postal_code: form.postal_code,
    certificate_holder_name: form.certificate_holder_name,
    additional_insured_wording: form.additional_insured_wording,
    owner_report_email: form.owner_report_email,
    owner_report_enabled: ownerReportEnabled,
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
                  label: `GL each-occurrence ≥ ${formatUsd(min)}`,
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
              label: `GL each-occurrence ≥ ${formatUsd(Number.isFinite(min) ? min : 1_000_000)}`,
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
          owner_report_email: form.owner_report_email.trim() || null,
          owner_report_enabled: ownerReportEnabled,
          rules: nextRules,
          vendorIds: Array.from(selected),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        notifyApiError(data, "Could not save property");
        return;
      }
      notifySuccess("Property saved");
      router.refresh();
    } catch (err) {
      notifyCaughtError(err, "Could not save property");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-6">
      {!canEdit ? (
        <Alert>
          <AlertDescription>
            Read-only role — property details, certificate-holder wording, and
            requirement overrides are managed by a Manager or Admin.
          </AlertDescription>
        </Alert>
      ) : null}

      <fieldset
        disabled={!canEdit}
        className="m-0 min-w-0 space-y-6 border-0 p-0"
      >
        <section className="space-y-4">
          <SectionHeading title="Property details" />
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
            <UsAddressFields
              className="sm:col-span-2"
              idPrefix="prop-addr"
              streetLabel="Address"
              value={{
                address_line: form.address_line,
                city: form.city,
                state: form.state,
                postal_code: form.postal_code,
              }}
              onChange={(next) => {
                validation.markTouched("postal_code");
                validation.markTouched("state");
                setForm({ ...form, ...next });
              }}
            />
            <div className="space-y-1 sm:col-span-2">
              <FieldError message={validation.errorFor("postal_code")} />
              <FieldError message={validation.errorFor("state")} />
              <FieldError message={validation.errorFor("address_line")} />
              <FieldError message={validation.errorFor("city")} />
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t pt-6">
          <SectionHeading
            title="Certificate holder & wording"
            hint="What must appear on every COI for this property."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="holder">Certificate holder name</FieldLabel>
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
                placeholder="…including Oak Street LLC as additional insured…"
              />
              <FieldError
                message={validation.errorFor("additional_insured_wording")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="llcs">
                Owner LLCs (comma-separated)
              </FieldLabel>
              <Input
                id="llcs"
                value={form.owner_llc_names}
                onChange={(e) =>
                  setForm({ ...form, owner_llc_names: e.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lenders">
                Lenders (comma-separated)
              </FieldLabel>
              <Input
                id="lenders"
                value={form.lender_names}
                onChange={(e) =>
                  setForm({ ...form, lender_names: e.target.value })
                }
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 border-t pt-6">
          <SectionHeading
            title="Owner report (D3)"
            hint="A monthly compliance summary for the building owner."
          />
          <div className="max-w-md space-y-1.5">
            <Field>
              <FieldLabel htmlFor="owner-email">Owner report email</FieldLabel>
              <Input
                id="owner-email"
                type="email"
                placeholder="owner@building.example"
                value={form.owner_report_email}
                aria-invalid={
                  Boolean(validation.errorFor("owner_report_email")) ||
                  undefined
                }
                onBlur={() => validation.markTouched("owner_report_email")}
                onChange={(e) =>
                  setForm({ ...form, owner_report_email: e.target.value })
                }
              />
              <FieldError message={validation.errorFor("owner_report_email")} />
            </Field>
            <label
              htmlFor="owner-report-enabled"
              className="mt-2 flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                id="owner-report-enabled"
                checked={ownerReportEnabled}
                onCheckedChange={(checked) => setOwnerReportEnabled(checked)}
              />
              Email monthly owner report automatically
            </label>
          </div>
        </section>

        <Card className="gap-0 py-0">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-semibold">
              Requirement override
            </CardTitle>
            <CardDescription className="text-xs">
              Merges over global + trade rules for documents tied to this
              property.
            </CardDescription>
          </CardHeader>
          <CardContent className="border-t py-4">
            <Field className="max-w-xs">
              <FieldLabel htmlFor="gl">
                GL each-occurrence minimum ($)
              </FieldLabel>
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
              Vendors on this property
            </CardTitle>
            <CardDescription className="text-xs">
              Checked vendors are tracked against this property’s requirements.
            </CardDescription>
            <CardAction className="text-muted-foreground self-center text-xs tabular-nums">
              {selected.size}/{vendors.length}
            </CardAction>
          </CardHeader>
          <CardContent className="divide-y border-t px-0">
            {vendors.map((v) => (
              <label
                key={v.id}
                htmlFor={`v-${v.id}`}
                className="hover:bg-muted/40 flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm"
              >
                <Checkbox
                  id={`v-${v.id}`}
                  checked={selected.has(v.id)}
                  onCheckedChange={() => toggleVendor(v.id)}
                />
                {v.name}
              </label>
            ))}
            {vendors.length === 0 ? (
              <p className="text-muted-foreground px-4 py-6 text-center text-sm">
                No vendors yet — add vendors first, then attach them here.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy || !validation.valid}>
            {busy ? "Saving…" : "Save property"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
