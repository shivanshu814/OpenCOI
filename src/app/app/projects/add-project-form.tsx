"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-lg border p-4 sm:grid-cols-4"
    >
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="proj-name">New project</Label>
        <Input
          id="proj-name"
          required
          placeholder="Roof Replace — Building A"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="start">Start</Label>
        <Input
          id="start"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="end">End</Label>
        <Input
          id="end"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <div className="flex items-end gap-3 sm:col-span-4">
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create project"}
        </Button>
        {msg ? <p className="text-muted-foreground text-xs">{msg}</p> : null}
      </div>
    </form>
  );
}
