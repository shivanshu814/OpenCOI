"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddPropertyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [holder, setHolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
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
        setMsg(data.error ?? "Failed");
        return;
      }
      if (data.property?.id) {
        router.push(`/app/properties/${data.property.id}`);
        router.refresh();
        return;
      }
      setMsg("Created");
      setName("");
      setHolder("");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid max-w-xl gap-3 rounded-lg border p-4 sm:grid-cols-2"
    >
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="prop-name">Property name</Label>
        <Input
          id="prop-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Oak Street Apartments"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="holder">Certificate holder / owner LLC</Label>
        <Input
          id="holder"
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          placeholder="Oak Street LLC c/o …"
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Add property"}
        </Button>
        {msg ? (
          <p className="text-muted-foreground mt-2 text-xs">{msg}</p>
        ) : null}
      </div>
    </form>
  );
}
