import { NextResponse } from "next/server";
import { parseBody } from "@/lib/validations/parseBody";
import { clientErrorReportSchema } from "@/lib/validations/schemas";
import { clientErrorLimiter, getClientIp } from "@/lib/rate-limit";

/**
 * Crash reports from the error boundaries (src/app/error.tsx and
 * global-error.tsx). There is no error-tracking service wired up, so without
 * this a tester's crash renders them a "Something went wrong" screen and
 * leaves no trace anywhere an operator will look. The report is only logged
 * — alert-tagged so one Vercel log alert on "_ALERT]" catches crashes along
 * with dead email and inert rate limiting.
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

  const { message, digest, url, stack } = result.data;
  console.error(
    "[CLIENT_ERROR_ALERT]",
    JSON.stringify({ message, digest, url, stack })
  );

  return NextResponse.json({ ok: true });
}
