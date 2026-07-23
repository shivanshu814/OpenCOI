"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddVendorForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [trade, setTrade] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, trade }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        demo?: boolean;
        message?: string;
        error?: string;
        vendor?: { name: string };
      };
      if (!res.ok) {
        setNote(data.error ?? "Failed to create vendor");
        return;
      }
      if (data.demo) {
        setNote(data.message ?? "Demo mode");
      } else {
        setNote(`Created ${data.vendor?.name ?? name}`);
        setName("");
        setEmail("");
        setTrade("");
        router.refresh();
      }
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid max-w-2xl gap-3 rounded-lg border p-4 sm:grid-cols-4"
    >
      <div className="space-y-1.5 sm:col-span-1">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Vendor LLC"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="ops@vendor.com"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-1">
        <Label htmlFor="trade">Trade</Label>
        <Input
          id="trade"
          value={trade}
          onChange={(e) => setTrade(e.target.value)}
          placeholder="Roofer"
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Saving…" : "Add vendor"}
        </Button>
      </div>
      {note ? (
        <p className="text-muted-foreground sm:col-span-4 text-xs">{note}</p>
      ) : null}
    </form>
  );
}
