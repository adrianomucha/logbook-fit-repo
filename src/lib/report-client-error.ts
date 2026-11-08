/**
 * Fire-and-forget crash report from the error boundaries to
 * POST /api/client-errors, where it becomes an alert-tagged log line —
 * the only place a tester's client-side crash leaves any trace.
 *
 * Must never throw and never block rendering the fallback UI: reporting a
 * crash badly is worse than not reporting it. `keepalive` lets the request
 * survive the user immediately navigating away or closing the tab.
 */
export function reportClientError(error: Error & { digest?: string }): void {
  try {
    fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        message: String(error?.message ?? "Unknown error").slice(0, 500),
        digest: error?.digest?.slice(0, 100),
        url:
          typeof window !== "undefined"
            ? scrubReportUrl(window.location.href)
            : undefined,
        stack: error?.stack?.slice(0, 4000),
      }),
    }).catch(() => {});
  } catch {
    // Deliberately swallowed — see above.
  }
}

/**
 * The page a crash happened on, minus anything that could be a credential.
 * Reset links, coach invites and beta invites all carry their token in the
 * query string (/reset-password?token=, /signup?invite=, /signup?beta=), so
 * a crash on one of those pages would otherwise write a live token into the
 * logs. Keeps origin and path, notes that a query existed, drops the
 * fragment. Used by the sender and again by the API route, which can't
 * trust what an older cached client sends.
 */
export function scrubReportUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}${parsed.search ? "?[redacted]" : ""}`.slice(0, 1000);
  } catch {
    return undefined;
  }
}
