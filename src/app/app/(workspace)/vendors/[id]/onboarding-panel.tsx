"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UsAddressFields,
  type UsAddress,
} from "@/components/ui/us-address-fields";
import { FALLBACK_US_STATES, toStateItems } from "@/lib/geo/us-states";
import {
  notifyApiError,
  notifyCaughtError,
  notifySuccess,
  notifyWarning,
} from "@/lib/ui/toast";
import {
  vendorAgreementSchema,
  vendorLicenseSchema,
  vendorTaxProfileSchema,
} from "@/lib/validation/schemas";
import { useZodForm } from "@/lib/validation/use-zod-form";
import { useEffect, useState } from "react";

const TIN_TYPE_ITEMS: ReadonlyArray<{ label: string; value: "ein" | "ssn" }> = [
  { label: "EIN", value: "ein" },
  { label: "SSN", value: "ssn" },
];

const STATE_ITEMS = toStateItems(FALLBACK_US_STATES);

const EMPTY_ADDRESS: UsAddress = {
  address_line: "",
  city: "",
  state: "",
  postal_code: "",
};

type Props = {
  vendorId: string;
  /** Managers and Admins. Read-only members see the record, not the controls. */
  canWrite: boolean;
  /**
   * Admins only. POST /api/vendors/[id]/onboarding already refuses a
   * non-admin `upsert_tax`; this keeps the TIN box from being fillable at all.
   */
  canAdmin: boolean;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-destructive text-xs" role="alert">
      {message}
    </p>
  );
}

export function VendorOnboardingPanel({
  vendorId,
  canWrite,
  canAdmin,
}: Props) {
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
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [tin, setTin] = useState("");
  const [tinType, setTinType] = useState<"ein" | "ssn">("ein");
  const [taxAddress, setTaxAddress] = useState<UsAddress>(EMPTY_ADDRESS);
  const [licNum, setLicNum] = useState("");
  const [licState, setLicState] = useState("");
  const [licExp, setLicExp] = useState("");

  const taxForm = useZodForm(vendorTaxProfileSchema, {
    action: "upsert_tax",
    legal_name: legalName,
    tin,
    tin_type: tinType,
    address_line: taxAddress.address_line,
    city: taxAddress.city,
    state: taxAddress.state,
    postal_code: taxAddress.postal_code,
  });
  const licenseForm = useZodForm(vendorLicenseSchema, {
    action: "add_license",
    license_number: licNum,
    license_state: licState,
    expires_on: licExp,
  });
  const agreementForm = useZodForm(vendorAgreementSchema, {
    action: "create_agreement",
  });

  async function load() {
    const res = await fetch(`/api/vendors/${vendorId}/onboarding`);
    const data = (await res.json()) as {
      tax?: {
        tin_masked?: string;
        legal_name?: string;
        address_line?: string | null;
        city?: string | null;
        state?: string | null;
        postal_code?: string | null;
      } | null;
      licenses?: typeof licenses;
      agreements?: typeof agreements;
    };
    setTaxMasked(data.tax?.tin_masked ?? null);
    if (data.tax?.legal_name) setLegalName(data.tax.legal_name);
    if (data.tax) {
      setTaxAddress({
        address_line: data.tax.address_line ?? "",
        city: data.tax.city ?? "",
        state: data.tax.state ?? "",
        postal_code: data.tax.postal_code ?? "",
      });
    }
    setLicenses(data.licenses ?? []);
    setAgreements(data.agreements ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setSigningUrl(null);
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
        notifyApiError(data, "Could not save onboarding");
        return;
      }
      if (data.agreement?.signing_url) {
        setSigningUrl(data.agreement.signing_url);
        if (data.demo) {
          notifyWarning("E-sign link ready (demo — Documenso not live)");
        } else {
          notifySuccess("Signing link ready for the vendor");
        }
      } else if (body.action === "add_license") {
        notifySuccess("License added");
      } else if (body.action === "upsert_tax") {
        notifySuccess("W-9 / TIN saved");
      } else {
        notifySuccess("Saved");
      }
      setTin("");
      await load();
    } catch (e) {
      notifyCaughtError(e, "Could not save onboarding");
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

      {!canWrite ? (
        <Alert className="rounded-none border-x-0 border-t-0">
          <AlertDescription className="text-xs">
            Read-only role — you can see what is on file, but adding paperwork
            is handled by a Manager or Admin.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="divide-y">
        <section className="px-4 py-4">
          <h3 className="text-sm font-medium">W-9 / TIN (admins)</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Field-level encrypted. UI shows masked TIN only (
            {taxMasked ?? "none on file"}).
          </p>
          {!canAdmin ? (
            <Alert className="mt-3">
              <AlertDescription className="text-xs">
                Tax identification numbers are Admin-only. Ask a workspace
                admin to record this vendor&apos;s W-9.
              </AlertDescription>
            </Alert>
          ) : null}
          <fieldset
            disabled={!canAdmin}
            className="m-0 min-w-0 border-0 p-0"
          >
          <div className="mt-3 grid gap-x-3 gap-y-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="legal">Legal name</Label>
              <Input
                id="legal"
                value={legalName}
                aria-invalid={
                  Boolean(taxForm.errorFor("legal_name")) || undefined
                }
                onBlur={() => taxForm.markTouched("legal_name")}
                onChange={(e) => setLegalName(e.target.value)}
              />
              <FieldError message={taxForm.errorFor("legal_name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tin">EIN / SSN</Label>
              <Input
                id="tin"
                value={tin}
                aria-invalid={Boolean(taxForm.errorFor("tin")) || undefined}
                onBlur={() => taxForm.markTouched("tin")}
                onChange={(e) => setTin(e.target.value)}
                placeholder="••-•••••••"
                autoComplete="off"
              />
              <FieldError message={taxForm.errorFor("tin")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tintype">Type</Label>
              <Select
                items={TIN_TYPE_ITEMS}
                value={tinType}
                onValueChange={(value) => {
                  if (value) setTinType(value);
                }}
              >
                <SelectTrigger id="tintype" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIN_TYPE_ITEMS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <UsAddressFields
              className="sm:col-span-2"
              idPrefix="w9-addr"
              value={taxAddress}
              onChange={(next) => {
                taxForm.markTouched("state");
                taxForm.markTouched("postal_code");
                setTaxAddress(next);
              }}
            />
            <div className="space-y-1 sm:col-span-2">
              <FieldError message={taxForm.errorFor("state")} />
              <FieldError message={taxForm.errorFor("postal_code")} />
              <FieldError message={taxForm.errorFor("address_line")} />
              <FieldError message={taxForm.errorFor("city")} />
            </div>
          </div>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            disabled={busy || !tin.trim() || !taxForm.valid}
            onClick={() => {
              taxForm.markSubmitted();
              if (!taxForm.valid) return;
              void post({
                action: "upsert_tax",
                legal_name: legalName,
                tin,
                tin_type: tinType,
                address_line: taxAddress.address_line,
                city: taxAddress.city,
                state: taxAddress.state,
                postal_code: taxAddress.postal_code,
              });
            }}
          >
            Save W-9 / TIN
          </Button>
          </fieldset>
        </section>

        <section className="px-4 py-4">
          <h3 className="text-sm font-medium">Trade license</h3>
          <fieldset
            disabled={!canWrite}
            className="m-0 min-w-0 border-0 p-0"
          >
          <div className="mt-3 grid gap-x-3 gap-y-3 sm:grid-cols-3">
            <Input
              placeholder="License #"
              aria-label="License number"
              value={licNum}
              aria-invalid={
                Boolean(licenseForm.errorFor("license_number")) || undefined
              }
              onBlur={() => licenseForm.markTouched("license_number")}
              onChange={(e) => setLicNum(e.target.value)}
            />
            <Select
              items={STATE_ITEMS}
              value={licState || null}
              onValueChange={(value) => {
                licenseForm.markTouched("license_state");
                setLicState(value ?? "");
              }}
            >
              <SelectTrigger aria-label="License state" className="w-full">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {STATE_ITEMS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DatePicker
              aria-label="License expiration date"
              placeholder="Expiration date"
              value={licExp}
              onChange={(iso) => {
                licenseForm.markTouched("expires_on");
                setLicExp(iso);
              }}
            />
          </div>
          <div className="mt-1 space-y-1">
            <FieldError message={licenseForm.errorFor("license_number")} />
            <FieldError message={licenseForm.errorFor("license_state")} />
            <FieldError message={licenseForm.errorFor("expires_on")} />
          </div>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            disabled={busy || !licenseForm.valid}
            onClick={() => {
              licenseForm.markSubmitted();
              if (!licenseForm.valid) return;
              void post({
                action: "add_license",
                license_number: licNum,
                license_state: licState,
                expires_on: licExp || undefined,
              });
            }}
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
          </fieldset>
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
            disabled={busy || !canWrite || !agreementForm.valid}
            onClick={() => {
              agreementForm.markSubmitted();
              if (!agreementForm.valid) return;
              void post({ action: "create_agreement" });
            }}
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

      {signingUrl ? (
        <CardFooter className="py-3">
          <p className="text-muted-foreground text-xs break-all">
            Signing link:{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href={signingUrl}
              target="_blank"
              rel="noreferrer"
            >
              {signingUrl}
            </a>
          </p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
