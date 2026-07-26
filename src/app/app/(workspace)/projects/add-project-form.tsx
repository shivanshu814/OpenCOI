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
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
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
        setMsg(data.error ?? "Create failed");
        return;
      }
      setName("");
      setStartDate("");
      setEndDate("");
      if (data.project?.id) {
        router.push(`/app/projects/${data.project.id}`);
        router.refresh();
        return;
      }
      setMsg("Created");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Create failed");
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
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="start">Start</FieldLabel>
            <DatePicker
              id="start"
              placeholder="Start date"
              value={startDate}
              onChange={setStartDate}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="end">End</FieldLabel>
            <DatePicker
              id="end"
              placeholder="End date"
              value={endDate}
              onChange={setEndDate}
            />
          </Field>
          <div className="flex items-center gap-3 sm:col-span-4">
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create project"}
            </Button>
            {msg ? <p className="text-muted-foreground text-xs">{msg}</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
