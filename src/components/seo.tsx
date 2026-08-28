/**
 * <JsonLd /> (RC2, C6): emits structured data into the initial HTML.
 * The JSON is escaped so user-influenced strings cannot break out of the
 * script element.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
