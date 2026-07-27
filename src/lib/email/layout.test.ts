import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { escapeHtml, listHtml, paragraphHtml, renderBrandedEmailHtml } from "./layout";

describe("escapeHtml", () => {
  it("escapes all five HTML-significant characters", () => {
    assert.equal(
      escapeHtml(`Ace & Sons <script>alert("x")</script> O'Neil`),
      "Ace &amp; Sons &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; O&#39;Neil",
    );
  });

  it("escapes ampersands first so entities are not double-mangled", () => {
    assert.equal(escapeHtml("&lt;"), "&amp;lt;");
  });
});

describe("renderBrandedEmailHtml", () => {
  const base = {
    heading: "Hello there",
    bodyHtml: paragraphHtml("Body content."),
    cta: { label: "Open portal", url: "https://example.test/portal/abc?a=1&b=2" },
  };

  it("renders a full self-contained document", () => {
    const html = renderBrandedEmailHtml(base);
    assert.match(html, /^<!DOCTYPE html>/);
    assert.match(html, /<\/html>$/);
    assert.match(html, /Hello there/);
    assert.match(html, /Body content\./);
    // Self-contained: no external stylesheet or remote font.
    assert.doesNotMatch(html, /<link|@import|fonts\.googleapis/);
  });

  it("defaults to the CertShield brand and green accent", () => {
    const html = renderBrandedEmailHtml(base);
    assert.match(html, /CertShield/);
    assert.match(html, /background-color:#00B884/);
  });

  it("puts the CTA URL in a bulletproof button and a paste fallback", () => {
    const html = renderBrandedEmailHtml(base);
    const escapedUrl = "https://example.test/portal/abc?a=1&amp;b=2";
    assert.match(html, new RegExp(`<td bgcolor="#00B884"`));
    assert.ok(html.includes(`href="${escapedUrl}"`), "escaped URL in href");
    const hits = html.split(escapedUrl).length - 1;
    assert.ok(hits >= 2, `expected the URL in button + fallback, saw ${hits}`);
    assert.match(html, /Paste this/);
    // The raw unescaped ampersand form must not appear in markup.
    assert.ok(!html.includes("?a=1&b=2"), "URL must be HTML-escaped");
  });

  it("renders a neutral secondary button alongside the primary", () => {
    const html = renderBrandedEmailHtml({
      ...base,
      secondaryCta: { label: "Deny", url: "https://example.test/deny" },
    });
    assert.match(html, /<td bgcolor="#00B884"/);
    assert.match(html, /<td bgcolor="#ffffff" style="border-radius:8px;border:1px solid #e2e5ea;"/);
    assert.match(html, /https:\/\/example\.test\/deny/);
    assert.match(html, /Paste these links/);
  });

  it("escapes heading, preheader, and CTA label", () => {
    const html = renderBrandedEmailHtml({
      heading: `<b>Owner & "co"</b>`,
      preheader: `Pre <i>view</i>`,
      bodyHtml: "<p>ok</p>",
      cta: { label: `Go <now> & fast`, url: "https://x.test/" },
    });
    assert.doesNotMatch(html, /<b>Owner/);
    assert.match(html, /&lt;b&gt;Owner &amp; &quot;co&quot;&lt;\/b&gt;/);
    assert.match(html, /Pre &lt;i&gt;view&lt;\/i&gt;/);
    assert.match(html, /Go &lt;now&gt; &amp; fast/);
  });

  it("accepts a sanitized custom hex accent", () => {
    const html = renderBrandedEmailHtml({
      ...base,
      brand: { name: "Riverside PM", color: "#1a2b3c" },
    });
    assert.match(html, /background-color:#1a2b3c/);
    assert.match(html, /Riverside PM/);
    assert.match(html, /<td bgcolor="#1a2b3c"/);
  });

  it("rejects a non-hex accent and falls back to the default", () => {
    const html = renderBrandedEmailHtml({
      ...base,
      brand: { color: 'red;background:url("evil")' },
    });
    assert.doesNotMatch(html, /evil/);
    assert.match(html, /background-color:#00B884/);
  });

  it("only renders https logos, never javascript: or http:", () => {
    const withHttps = renderBrandedEmailHtml({
      ...base,
      brand: { name: "Riverside PM", logoUrl: "https://cdn.test/logo.png" },
    });
    assert.match(withHttps, /<img src="https:\/\/cdn\.test\/logo\.png"/);

    for (const bad of ["http://cdn.test/logo.png", "javascript:alert(1)"]) {
      const html = renderBrandedEmailHtml({ ...base, brand: { logoUrl: bad } });
      assert.doesNotMatch(html, /<img/);
    }
  });

  it("renders footer notes and omits buttons when there is no CTA", () => {
    const html = renderBrandedEmailHtml({
      heading: "Report",
      bodyHtml: listHtml(["one", "two"]),
      footerNote: "Not legal advice.",
    });
    assert.doesNotMatch(html, /<td bgcolor="#00B884"/);
    assert.doesNotMatch(html, /Paste this/);
    assert.match(html, /Not legal advice\./);
    assert.match(html, /<li[^>]*>one<\/li>/);
  });
});
