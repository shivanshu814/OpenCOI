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
              onChange={(e) => setName(e.target.value)}
              placeholder="Oak Street Apartments"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="holder">
              Certificate holder / owner LLC
            </FieldLabel>
            <Input
              id="holder"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="Oak Street LLC c/o …"
            />
          </Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Add property"}
            </Button>
            {msg ? (
              <p className="text-muted-foreground text-xs">{msg}</p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
