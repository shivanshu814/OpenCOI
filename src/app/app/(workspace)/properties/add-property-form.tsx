"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  notifyApiError,
  notifyCaughtError,
} from "@/lib/ui/toast";
import { propertyCreateSchema } from "@/lib/validation/schemas";
import { useZodForm } from "@/lib/validation/use-zod-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function AddPropertyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [holder, setHolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const validation = useZodForm(propertyCreateSchema, {
    name,
    certificate_holder_name: holder,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    validation.markSubmitted();
    if (!validation.valid) return;
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          certificate_holder_name: holder || null,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        property?: { id: string };
      };
      if (!res.ok) {
        const err = data.error ?? "Could not create property";
        setFormError(err);
        notifyApiError(data, err);
        return;
      }
      if (data.property?.id) {
        // Detail page is the success signal — no toast.
        router.push(`/app/properties/${data.property.id}`);
        router.refresh();
        return;
      }
      setName("");
      setHolder("");
      validation.reset();
      router.refresh();
    } catch (err) {
      notifyCaughtError(err, "Could not create property");
      setFormError(err instanceof Error ? err.message : "Could not create property");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-semibold">Add a property</CardTitle>
        <CardDescription className="text-xs">
          You can add the address, owner LLCs, and overrides on the next screen.
        </CardDescription>
      </CardHeader>
      <CardContent className="border-t py-4">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="prop-name">Property name</FieldLabel>
            <Input
              id="prop-name"
              required
              value={name}
              aria-invalid={Boolean(validation.errorFor("name")) || undefined}
              onBlur={() => validation.markTouched("name")}
              onChange={(e) => setName(e.target.value)}
              placeholder="Oak Street Apartments"
            />
            {validation.errorFor("name") ? (
              <p className="text-destructive text-xs" role="alert">
                {validation.errorFor("name")}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="holder">
              Certificate holder / owner LLC
            </FieldLabel>
            <Input
              id="holder"
              value={holder}
              aria-invalid={
                Boolean(validation.errorFor("certificate_holder_name")) ||
                undefined
              }
              onBlur={() => validation.markTouched("certificate_holder_name")}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="Oak Street LLC c/o …"
            />
            {validation.errorFor("certificate_holder_name") ? (
              <p className="text-destructive text-xs" role="alert">
                {validation.errorFor("certificate_holder_name")}
              </p>
            ) : null}
          </Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button
              type="submit"
              pending={busy}
              pendingGlyph="building"
              disabled={busy || !validation.valid}
            >
              {busy ? "Saving…" : "Add property"}
            </Button>
            {formError ? (
              <p className="text-destructive text-xs" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
