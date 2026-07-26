import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderTeamInviteEmail } from "./team-invite";

const base = {
  orgName: "Riverside Property Management",
  invitedByEmail: "ops@riversidepm.com",
  invitedEmail: "regional@riversidepm.com",
  signInUrl: "https://getcertshield.vercel.app/login?next=%2Fapp",
};

describe("team invite email", () => {
  it("names the org in the subject so it is recognizable in a busy inbox", () => {
    const { subject } = renderTeamInviteEmail({ ...base, role: "member" });
    assert.match(subject, /Riverside Property Management/);
    assert.match(subject, /CertShield/);
  });

  it("tells the invitee which address to sign in with", () => {
    // Auto-join keys on the *invited* address, so signing in with a personal
    // account silently creates a separate empty org instead of joining.
    const { text, html } = renderTeamInviteEmail({ ...base, role: "member" });
    assert.match(text, /regional@riversidepm\.com/);
    assert.match(html, /regional@riversidepm\.com/);
  });

  it("describes what each role can actually do", () => {
    const admin = renderTeamInviteEmail({ ...base, role: "admin" });
    const manager = renderTeamInviteEmail({ ...base, role: "member" });
    const viewer = renderTeamInviteEmail({ ...base, role: "viewer" });

    assert.match(admin.text, /settings and billing/);
    assert.match(manager.text, /upload certificates/);
    assert.match(viewer.text, /read-only/);

    // Read-only must not be told it can change things.
    assert.doesNotMatch(viewer.text, /manage vendors|change workspace settings/);
  });

  it("names the inviter when known, and stays sensible when not", () => {
    const withInviter = renderTeamInviteEmail({ ...base, role: "member" });
    assert.match(withInviter.text, /ops@riversidepm\.com invited you/);

    const anonymous = renderTeamInviteEmail({
      ...base,
      invitedByEmail: null,
      role: "member",
    });
    assert.doesNotMatch(anonymous.text, /null|undefined/);
    assert.match(anonymous.text, /this company uses/);
  });

  it("includes the sign-in URL in both the button and as pasteable text", () => {
    const { html, text } = renderTeamInviteEmail({ ...base, role: "member" });
    assert.match(text, /getcertshield\.vercel\.app\/login/);
    // Once in the href, once in the "button not working" fallback.
    const hits = html.split("getcertshield.vercel.app/login").length - 1;
    assert.ok(hits >= 2, `expected the URL twice, saw ${hits}`);
  });

  it("gives an opt-out for someone who was added by mistake", () => {
    const { text } = renderTeamInviteEmail({ ...base, role: "member" });
    assert.match(text, /ignore this email/i);
  });

  it("escapes org names so a stray angle bracket cannot break the markup", () => {
    const { html } = renderTeamInviteEmail({
      ...base,
      orgName: 'Ace <script>alert("x")</script> & Sons',
      role: "member",
    });
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&amp; Sons/);
  });

  it("falls back to generic wording when the org has no name", () => {
    const { subject, text } = renderTeamInviteEmail({
      ...base,
      orgName: "   ",
      role: "member",
    });
    assert.doesNotMatch(subject, /^\s+added/);
    assert.match(text, /a CertShield workspace/);
  });
});
