"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

type Props = { vendorId: string };

export function VendorOnboardingPanel({ vendorId }: Props) {
  const [taxMasked, setTaxMasked] = useState<string | null>(null);
  const [licenses, setLicenses] = useState<
    {
      id: string;
      license_number: string | null;
      state: string | null;
      expires_on: string | null;
      board_lookup_url: string | null;
    }[]
  >([]);
  const [agreements, setAgreements] = useState<
    { id: string; title: string; status: string; signing_url: string | null }[]
  >([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [tin, setTin] = useState("");
  const [tinType, setTinType] = useState<"ein" | "ssn">("ein");
  const [licNum, setLicNum] = useState("");
  const [licState, setLicState] = useState("CA");
  const [licExp, setLicExp] = useState("");

  async function load() {
    const res = await fetch(`/api/vendors/${vendorId}/onboarding`);
    const data = (await res.json()) as {
      tax?: { tin_masked?: string; legal_name?: string } | null;
      licenses?: typeof licenses;
      agreements?: typeof agreements;
    };
    setTaxMasked(data.tax?.tin_masked ?? null);
    if (data.tax?.legal_name) setLegalName(data.tax.legal_name);
    setLicenses(data.licenses ?? []);
    setAgreements(data.agreements ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        error?: string;
        agreement?: { signing_url?: string };
        demo?: boolean;
      };
      if (!res.ok) {
        setMsg(data.error ?? "Failed");
        return;
      }
      if (data.agreement?.signing_url) {
        setMsg(
          data.demo
            ? `Demo e-sign link: ${data.agreement.signing_url}`
            : `Signing link sent / ready: ${data.agreement.signing_url}`,
        );
      } else {
        setMsg("Saved");
      }
      setTin("");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="min-w-0 gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>Onboarding &amp; paperwork</CardTitle>
        <CardDescription className="text-xs">
          W-9, trade license, and signed agreements for this vendor.
        </CardDescription>
      </CardHeader>

      <div className="divide-y">
        <section className="px-4 py-4">
          <h3 className="text-sm font-medium">W-9 / TIN (admins)</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Field-level encrypted. UI shows masked TIN only (
            {taxMasked ?? "none on file"}).
          </p>
          <div className="mt-3 grid gap-x-3 gap-y-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="legal">Legal name</Label>
              <Input
                id="legal"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tin">EIN / SSN</Label>
              <Input
                id="tin"
                value={tin}
                onChange={(e) => setTin(e.target.value)}
                placeholder="••-•••••••"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tintype">Type</Label>
              <select
                id="tintype"
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
                value={tinType}
                onChange={(e) => setTinType(e.target.value as "ein" | "ssn")}
              >
                <option value="ein">EIN</option>
                <option value="ssn">SSN</option>
              </select>
            </div>
          </div>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            disabled={busy || !tin.trim()}
            onClick={() =>
              void post({
                action: "upsert_tax",
                legal_name: legalName,
                tin,
                tin_type: tinType,
              })
            }
          >
            Save W-9 / TIN
          </Button>
        </section>

        <section className="px-4 py-4">
          <h3 className="text-sm font-medium">Trade license</h3>
          <div className="mt-3 grid gap-x-3 gap-y-3 sm:grid-cols-3">
            <Input
              placeholder="License #"
              value={licNum}
              onChange={(e) => setLicNum(e.target.value)}
            />
            <Input
              placeholder="State (CA)"
              value={licState}
              onChange={(e) => setLicState(e.target.value)}
            />
            <Input
              type="date"
              value={licExp}
              onChange={(e) => setLicExp(e.target.value)}
            />
          </div>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void post({
                action: "add_license",
                license_number: licNum,
                license_state: licState,
                expires_on: licExp || undefined,
              })
            }
          >
            Add license
          </Button>
          {licenses.length > 0 ? (
            <ul className="text-muted-foreground mt-3 space-y-1 text-xs">
              {licenses.map((l) => (
                <li key={l.id} className="tabular-nums">
                  {l.license_number ?? "—"} · {l.state} · exp{" "}
                  {l.expires_on ?? "—"}{" "}
                  {l.board_lookup_url ? (
                    <a
                      className="underline underline-offset-4"
                      href={l.board_lookup_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      board lookup
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="px-4 py-4">
          <h3 className="text-sm font-medium">Agreement e-sign (Documenso)</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Sends Confirm-style signing link to vendor email (demo without API
            key).
          </p>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void post({ action: "create_agreement" })}
          >
            Send hold-harmless for signature
          </Button>
          {agreements.length > 0 ? (
            <ul className="text-muted-foreground mt-3 space-y-1 text-xs">
              {agreements.map((a) => (
                <li key={a.id}>
                  {a.title} · {a.status}{" "}
                  {a.signing_url ? (
                    <a
                      className="underline underline-offset-4"
                      href={a.signing_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      open
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      {msg ? (
        <CardFooter className="py-3">
          <p className="text-muted-foreground text-xs break-all">{msg}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
