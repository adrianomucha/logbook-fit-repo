import { NextResponse } from "next/server";
import { parseBody } from "@/lib/validations/parseBody";
import { clientErrorReportSchema } from "@/lib/validations/schemas";
import { clientErrorLimiter, getClientIp } from "@/lib/rate-limit";
import { scrubReportUrl } from "@/lib/report-client-error";
import { alertOperators } from "@/lib/operator-alerts";

/**
 * Crash reports from the error boundaries (src/app/error.tsx and
 * global-error.tsx) and from the app's crash screens. There is no
 * error-tracking service wired up, so without this a crash renders a
 * "Something went wrong" screen and leaves no trace anywhere an operator
 * will look. The report is logged with an alert tag and emailed to the
 * operators (throttled, see lib/operator-alerts.ts).
 *
 * Unauthenticated on purpose: the marketing page and auth screens crash too.
 * The schema hard-caps every field and the limiter bounds the volume.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = await clientErrorLimiter(ip);
  if (!allowed) {
    return NextResponse.json({ error: "Too many reports" }, { status: 429 });
  }

  const result = await parseBody(req, clientErrorReportSchema);
  if (!result.success) return result.response;

  const { message, digest, stack, platform } = result.data;
  // Query strings can hold reset or invite tokens; never log them
  const url = scrubReportUrl(result.data.url);
  await alertOperators("client-crash", message || "Unknown error", {
    platform: platform ?? "web",
    digest,
    url,
    stack,
  });

  return NextResponse.json({ ok: true });
}
