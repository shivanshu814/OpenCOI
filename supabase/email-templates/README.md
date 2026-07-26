# Supabase auth email templates

Paste-ready HTML for **Authentication → Emails → Templates**. Kept in the repo
so the templates are reviewable and restorable — the Supabase dashboard has no
version history, so a bad edit there is unrecoverable otherwise.

## Which templates this app actually sends

`web/src/app/login/page.tsx` only ever calls `signInWithOtp` and
`signInWithOAuth`. There are no passwords, no email-change flow, and team
invites do not go through Supabase. So of the six templates in the dashboard,
**two are reachable**:

| Template | Reachable? | File | Subject |
| --- | --- | --- | --- |
| **Confirm sign up** | ✅ **first-time users** | `confirm-signup.html` | `Confirm your email to open CertShield` |
| **Magic link or OTP** | ✅ returning users | `magic-link.html` | `Your CertShield sign-in link` |
| Invite user | ❌ never | — | Supabase's `inviteUserByEmail` is not used; invites are rows in `org_invites` + `claim_pending_invites` on first sign-in |
| Change email address | ❌ never | — | no change-email flow exists |
| Reset password | ❌ never | — | the product has no passwords |
| Reauthentication | ❌ never | — | `updateUser` is never called with sensitive fields |

### The Confirm-sign-up trap

Supabase decides between these two by whether the account already exists.
`signInWithOtp` against a brand-new address **creates** the user, so it sends
**Confirm sign up** — not Magic link.

That means Confirm sign up is the first email every new customer ever receives,
and it is the easy one to forget: the founder's own account already exists, so
testing sign-in only ever exercises the Magic link template. Style both.

## Security notification toggles

Same page, "Security" section. Recommended:

| Toggle | Setting | Why |
| --- | --- | --- |
| Sign-in method linked | **on** | Fires when Google is linked to an existing email account — a real security event the account owner should hear about |
| Sign-in method removed | **on** | Same, in reverse |
| Password changed | off | No passwords in the product |
| Email address changed | off | No change-email flow |
| Phone number changed | off | Phone is used for vendor SMS, never for auth |
| MFA method added / removed | off | MFA is not offered yet |

## After pasting

1. **Raise the email rate limit.** Enabling custom SMTP sets it to 30/hour,
   which a handful of signups plus invites can exhaust — and once it is hit,
   nobody can sign in. Authentication → Rate Limits → raise to ~200/hour.
2. Send yourself one of each and check it in Gmail **and** Outlook.
3. Confirm the sender address matches a domain verified with the SMTP provider,
   or the mail lands in spam regardless of how it looks.

## Editing notes

These use table layout, inline styles, and a `bgcolor` table cell for the
button because Outlook ignores flex/grid and drops padding on `<a>`. The font
is a system stack — Poppins is not available in mail clients and would fall
back silently.

Both templates print `{{ .Token }}` alongside the link. Corporate link scanners
routinely fetch a one-time URL before the human clicks it, which burns the link
and locks the user out of their own sign-in; the code gives them a way through.

Available variables: `{{ .ConfirmationURL }}`, `{{ .Token }}`,
`{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .RedirectTo }}`.
