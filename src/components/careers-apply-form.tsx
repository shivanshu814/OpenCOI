"use client";

import { Button } from "@/components/ui/button";
import { notifyApiError, notifySuccess } from "@/lib/ui/toast";
import { careersApplySchema } from "@/lib/validation/schemas";
import { useState } from "react";

export function CareersApplyForm({ jobSlug }: { jobSlug: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const fd = new FormData(e.currentTarget);
      const payload = {
        jobSlug,
        name: (fd.get("name") ?? "").toString(),
        email: (fd.get("email") ?? "").toString(),
        linkedinUrl: (fd.get("linkedinUrl") ?? "").toString(),
        location: (fd.get("location") ?? "").toString(),
        yearsExperience: (fd.get("yearsExperience") ?? "").toString(),
        pitch: (fd.get("pitch") ?? "").toString(),
        companyWebsite: (fd.get("companyWebsite") ?? "").toString(),
      };

      const parsed = careersApplySchema.safeParse(payload);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path.join(".");
          if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }

      const res = await fetch("/api/careers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        notifyApiError(data, "Couldn't send application");
        return;
      }
      setSent(true);
      notifySuccess("Application sent — you'll hear back within 3 days.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-card space-y-3 rounded-xl border border-border/80 p-6 shadow-xs">
        <p className="text-sm font-medium">Thanks — application received.</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          I read every application myself. If it&rsquo;s a fit, you&rsquo;ll hear from{" "}
          <span className="text-foreground font-medium">
            hello@getcertshield.app
          </span>{" "}
          within 3 days. If not, I&rsquo;ll still send a short reply — I hate being
          ghosted and won&rsquo;t do it to you.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-card space-y-5 rounded-xl border border-border/80 p-6 shadow-xs"
      noValidate
    >
      <Field
        label="Your name"
        name="name"
        required
        error={errors.name}
        autoComplete="name"
      />
      <Field
        label="Email"
        name="email"
        type="email"
        required
        error={errors.email}
        autoComplete="email"
      />
      <Field
        label="LinkedIn URL (or portfolio)"
        name="linkedinUrl"
        type="url"
        error={errors.linkedinUrl}
        placeholder="https://linkedin.com/in/…"
        autoComplete="url"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Where are you based?"
          name="location"
          error={errors.location}
          placeholder="e.g. Bengaluru or Austin, TX"
        />
        <Field
          label="Years of sales experience"
          name="yearsExperience"
          type="number"
          error={errors.yearsExperience}
          placeholder="e.g. 3"
          min="0"
          max="60"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pitch" className="text-sm font-medium">
          Why you&rsquo;ll crush this role
          <span className="text-brand ml-0.5">*</span>
        </label>
        <textarea
          id="pitch"
          name="pitch"
          rows={5}
          required
          minLength={30}
          maxLength={2000}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-3"
          placeholder="Two or three sentences. What you've sold before, why this role, why now."
        />
        {errors.pitch ? (
          <p className="text-destructive text-xs">{errors.pitch}</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            No cover letters. Founder reads these — write like you would to a
            person, not a résumé.
          </p>
        )}
      </div>

      {/*
        Honeypot — hidden from humans, catnip for form bots. `aria-hidden` +
        `tabIndex={-1}` keeps assistive tech from focusing it; the label is
        deliberately generic ("company website") so bots think it's real.
      */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "-10000px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label htmlFor="companyWebsite">Company website</label>
        <input
          type="text"
          id="companyWebsite"
          name="companyWebsite"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" size="lg" pending={busy} disabled={busy}>
          {busy ? "Sending…" : "Send application"}
        </Button>
        <p className="text-muted-foreground text-xs">
          By applying you agree to be contacted about this role. See{" "}
          <a
            href="/privacy"
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            Privacy
          </a>
          .
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  error,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
        {required ? <span className="text-brand ml-0.5">*</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-3"
        {...rest}
      />
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
