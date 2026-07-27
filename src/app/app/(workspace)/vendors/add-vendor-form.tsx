"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  notifyApiError,
  notifyCaughtError,
  notifySuccess,
  notifyWarning,
} from "@/lib/ui/toast";
import { vendorCreateSchema } from "@/lib/validation/schemas";
import { useZodForm } from "@/lib/validation/use-zod-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function AddVendorForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [trade, setTrade] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validation = useZodForm(vendorCreateSchema, { name, email, trade });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    validation.markSubmitted();
    if (!validation.valid) return;
    setBusy(true);
    setFieldError(null);
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
        // Validation / create errors stay near the form.
        setFieldError(data.error ?? "Could not add vendor");
        notifyApiError(data, "Could not add vendor");
        return;
      }
      if (data.demo) {
        notifyWarning(
          data.message ??
            "Demo mode — vendor not saved to the cloud. Connect Supabase.",
        );
        return;
      }
      const created = data.vendor?.name ?? name;
      notifySuccess(`Vendor added: ${created}`);
      setName("");
      setEmail("");
      setTrade("");
      validation.reset();
      router.refresh();
    } catch (err) {
      notifyCaughtError(err, "Could not add vendor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>Add a vendor</CardTitle>
        <CardDescription className="text-xs">
          Name and email are enough to start — chase emails go to this address.
        </CardDescription>
      </CardHeader>
      <form
        onSubmit={onSubmit}
        className="grid items-end gap-x-3 gap-y-4 px-4 py-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            aria-invalid={Boolean(validation.errorFor("name")) || undefined}
            onBlur={() => validation.markTouched("name")}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Vendor LLC"
          />
          {validation.errorFor("name") ? (
            <p className="text-destructive text-xs" role="alert">
              {validation.errorFor("name")}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            aria-invalid={Boolean(validation.errorFor("email")) || undefined}
            onBlur={() => validation.markTouched("email")}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="ops@vendor.com"
          />
          {validation.errorFor("email") ? (
            <p className="text-destructive text-xs" role="alert">
              {validation.errorFor("email")}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trade">Trade</Label>
          <Input
            id="trade"
            value={trade}
            aria-invalid={Boolean(validation.errorFor("trade")) || undefined}
            onBlur={() => validation.markTouched("trade")}
            onChange={(e) => setTrade(e.target.value)}
            placeholder="Roofer"
          />
          {validation.errorFor("trade") ? (
            <p className="text-destructive text-xs" role="alert">
              {validation.errorFor("trade")}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          pending={busy}
          pendingGlyph="user"
          disabled={busy || !validation.valid}
        >
          {busy ? "Saving…" : "Add vendor"}
        </Button>
        {fieldError ? (
          <p className="text-destructive text-xs sm:col-span-4" role="alert">
            {fieldError}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
