/**
 * Renders one JSON-LD `<script>`.
 *
 * `</script>` inside a string value would close the tag early and break the
 * document (and is the classic XSS vector for this pattern), so the forward
 * slash is escaped — `<` is still valid JSON and parses identically.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
