import type { Instrumentation } from "next";

/**
 * Next calls this for every error a route handler, page or server action
 * lets escape: the requests that end as a 500. Without it those live only in
 * the server log. The operators get an email (throttled) with the route and
 * the digest shown on the user's crash screen.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const err = error as Error & { digest?: string };
  // Node only: this file is also built for the edge runtime (middleware),
  // where the alert code's Node modules do not exist. The check has to wrap
  // the import so the edge build drops it.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { alertOperators } = await import("@/lib/operator-alerts");
    await alertOperators(
      "server-error",
      err?.message?.slice(0, 500) || "Unknown error",
      {
        method: request.method,
        // No query string: reset and invite links carry their token there
        path: request.path.split("?")[0],
        route: context.routePath,
        routeType: context.routeType,
        digest: err?.digest,
        stack: err?.stack?.slice(0, 4000),
      },
    );
  }
};
