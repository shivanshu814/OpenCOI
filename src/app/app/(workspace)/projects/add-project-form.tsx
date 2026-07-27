"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  notifyApiError,
  notifyCaughtError,
} from "@/lib/ui/toast";
import { projectCreateSchema } from "@/lib/validation/schemas";
import { useZodForm } from "@/lib/validation/use-zod-form";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const validation = useZodForm(projectCreateSchema, {
    name,
    start_date: startDate,
    end_date: endDate,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    validation.markSubmitted();
    if (!validation.valid) return;
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        project?: { id: string };
      };
      if (!res.ok) {
        const err = data.error ?? "Could not create project";
        setFormError(err);
        notifyApiError(data, err);
        return;
      }
      setName("");
      setStartDate("");
      setEndDate("");
      validation.reset();
      if (data.project?.id) {
        router.push(`/app/projects/${data.project.id}`);
        router.refresh();
        return;
      }
      router.refresh();
    } catch (err) {
      notifyCaughtError(err, "Could not create project");
      setFormError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-semibold">
          Create a project
        </CardTitle>
        <CardDescription className="text-xs">
          You can attach subs and set job-specific limits on the next screen.
        </CardDescription>
      </CardHeader>
      <CardContent className="border-t py-4">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-4">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="proj-name">Project name</FieldLabel>
            <Input
              id="proj-name"
              required
              placeholder="Roof Replace — Building A"
              value={name}
              aria-invalid={Boolean(validation.errorFor("name")) || undefined}
              onBlur={() => validation.markTouched("name")}
              onChange={(e) => setName(e.target.value)}
            />
            {validation.errorFor("name") ? (
              <p className="text-destructive text-xs" role="alert">
                {validation.errorFor("name")}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="start">Start</FieldLabel>
            <DatePicker
              id="start"
              placeholder="Start date"
              value={startDate}
              onChange={(iso) => {
                validation.markTouched("start_date");
                setStartDate(iso);
              }}
            />
            {validation.errorFor("start_date") ? (
              <p className="text-destructive text-xs" role="alert">
                {validation.errorFor("start_date")}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="end">End</FieldLabel>
            <DatePicker
              id="end"
              placeholder="End date"
              value={endDate}
              onChange={(iso) => {
                validation.markTouched("end_date");
                setEndDate(iso);
              }}
            />
            {validation.errorFor("end_date") ? (
              <p className="text-destructive text-xs" role="alert">
                {validation.errorFor("end_date")}
              </p>
            ) : null}
          </Field>
          <div className="flex items-center gap-3 sm:col-span-4">
            <Button type="submit" disabled={busy || !validation.valid}>
              {busy ? "Creating…" : "Create project"}
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
