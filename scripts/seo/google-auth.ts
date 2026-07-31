/**
 * Google OAuth token minting for the Search Console + Indexing APIs.
 *
 * Deliberately dependency-free. Pulling `googleapis` in would add ~50 MB and a
 * transitive tree to a Next.js app that never calls Google at runtime — these
 * scripts run on a laptop or in CI, not in a request. Both credential shapes
 * are a signed HTTP POST to one endpoint, which is ~40 lines of `node:crypto`.
 *
 * Two credential shapes are supported, tried in this order:
 *
 *   1. **Service account** — `GOOGLE_APPLICATION_CREDENTIALS=/path/key.json`.
 *      The shape Google's own Indexing API docs assume. Note that a project
 *      may refuse to mint keys at all: Google now applies the
 *      `iam.disableServiceAccountKeyCreation` org policy to new projects by
 *      default, which is why option 2 exists and is the documented path.
 *
 *   2. **User credentials (ADC)** — created once with the command in
 *      `ADC_LOGIN_COMMAND` below (one login, all three scopes).
 *
 *      This authorises the human who already owns the Search Console property,
 *      so no extra grant is needed — with a service account you must ALSO add
 *      its email as an owner in Search Console, which is the step everyone
 *      forgets and then debugs as a 403.
 *
 * Tokens are cached in-process only. They live an hour; a script run does not.
 */

import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const SCOPES = {
  /** Read + write Search Console (sitemap submission needs write). */
  searchConsole: "https://www.googleapis.com/auth/webmasters",
  indexing: "https://www.googleapis.com/auth/indexing",
  /** Needed by `verify-site.ts` to prove domain ownership via a DNS TXT record. */
  siteVerification: "https://www.googleapis.com/auth/siteverification",
} as const;

/**
 * The one login command every script in this directory tells you to run.
 *
 * Deliberately a single constant listing ALL three scopes: when each script
 * printed only the scopes it personally needed, you would log in for Search
 * Console, then hit `verify-site.ts` and be told to log in again with a
 * different set — and the second login silently replaces the first. One
 * command, granted once, covers the whole toolkit.
 */
export const ADC_LOGIN_COMMAND =
  "gcloud auth application-default login \\\n" +
  `  --scopes=${[
    // gcloud REJECTS the whole command without this one:
    //   "cloud-platform scope is required but not requested".
    // ADC is a general-purpose credential, so gcloud insists the base scope is
    // present even when every caller only wants the three below.
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/siteverification",
    "https://www.googleapis.com/auth/webmasters",
    "https://www.googleapis.com/auth/indexing",
  ].join(",")}`;

type ServiceAccountKey = {
  type: "service_account";
  client_email: string;
  private_key: string;
};

type AuthorizedUser = {
  type: "authorized_user";
  client_id: string;
  client_secret: string;
  refresh_token: string;
  /** Written by `gcloud auth application-default set-quota-project`. */
  quota_project_id?: string;
};

type Credential = ServiceAccountKey | AuthorizedUser;

const ADC_PATH = path.join(
  homedir(),
  ".config",
  "gcloud",
  "application_default_credentials.json",
);

let cached: { token: string; expiresAt: number; scope: string } | null = null;

async function loadCredential(): Promise<Credential | null> {
  const explicit = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  for (const file of [explicit, ADC_PATH].filter(Boolean) as string[]) {
    try {
      return JSON.parse(await readFile(file, "utf8")) as Credential;
    } catch {
      // Fall through to the next candidate — an unreadable explicit path is
      // still worth reporting, but only if ADC is also absent.
    }
  }
  return null;
}

/**
 * The `x-goog-user-project` header user credentials need, or `{}`.
 *
 * ADC user credentials carry no project of their own, so Google bills the
 * call to nothing and several APIs — Search Console among them — answer 403
 * with *"requires a quota project, which is not set by default"*. Google's own
 * client libraries read `quota_project_id` out of the ADC file and send it as
 * this header; we mint tokens by hand, so we have to do the same.
 *
 * Set it once with:
 *   gcloud auth application-default set-quota-project certshield-503610
 *
 * Service accounts are exempt — they belong to a project already.
 */
export async function quotaProjectHeaders(): Promise<Record<string, string>> {
  const cred = await loadCredential();
  if (!cred || cred.type !== "authorized_user") return {};
  const project =
    cred.quota_project_id?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim();
  return project ? { "x-goog-user-project": project } : {};
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** RS256-sign the assertion a service account exchanges for an access token. */
function signJwt(key: ServiceAccountKey, scope: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope,
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${base64url(signer.sign(key.private_key))}`;
}

/**
 * An access token for `scope`, or null when no credential is configured.
 *
 * Returns null rather than throwing so a caller can degrade to "skipped" —
 * the toolkit's rule is that an unwired service never fails a run.
 */
export async function googleAccessToken(scope: string): Promise<string | null> {
  if (cached && cached.scope === scope && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const cred = await loadCredential();
  if (!cred) {
    console.log(
      `  ⊘ skipped — no Google credential. Run once:\n\n    ${ADC_LOGIN_COMMAND}\n`,
    );
    return null;
  }

  const body =
    cred.type === "service_account"
      ? new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: signJwt(cred, scope),
        })
      : new URLSearchParams({
          grant_type: "refresh_token",
          client_id: cred.client_id,
          client_secret: cred.client_secret,
          refresh_token: cred.refresh_token,
        });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    // The overwhelmingly common cause: ADC was created without the SEO scopes,
    // so name the fix rather than echoing Google's opaque `invalid_scope`.
    console.log(
      `  ⊘ skipped — token exchange failed (${res.status}): ${text.slice(0, 200)}\n` +
        `    If this says invalid_scope / insufficient scope, re-run:\n\n    ${ADC_LOGIN_COMMAND}\n`,
    );
    return null;
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
    scope,
  };
  return json.access_token;
}

/** Which credential shape is in play — printed so runs are auditable. */
export async function describeCredential(): Promise<string> {
  const cred = await loadCredential();
  if (!cred) return "none";
  return cred.type === "service_account"
    ? `service account ${cred.client_email}`
    : "user credentials (ADC)";
}
