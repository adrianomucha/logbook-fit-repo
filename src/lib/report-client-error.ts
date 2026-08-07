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
            ? window.location.href.slice(0, 1000)
            : undefined,
        stack: error?.stack?.slice(0, 4000),
      }),
    }).catch(() => {});
  } catch {
    // Deliberately swallowed — see above.
  }
}
