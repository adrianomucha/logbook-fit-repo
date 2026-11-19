import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { setupCallBookingUrl, setupCallLink } from "@/lib/setup-call";
import { setupCallNudgePreview } from "@/lib/services/email";
import { countBacklogNudges, sendBacklogNudgeBatch } from "@/lib/setup-call-nudge";

export const dynamic = "force-dynamic";
// A full batch at the mailer's pace (lib/setup-call-nudge.ts) takes about 30s
export const maxDuration = 60;

async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return isAdminEmail(session?.user?.email);
}

/**
 * The one-off "you can skip the waitlist now" email to the backlog: people
 * who joined more than 14 days ago, before booking a setup call existed,
 * and are still waiting. Owner-only, session auth only (the admin waitlist
 * page's button).
 *
 * GET: how many it would still reach. GET ?preview=1: the email itself, as
 * it will be sent, with a placeholder address.
 */
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const link = setupCallLink();
  if (new URL(req.url).searchParams.get("preview")) {
    if (!link) return new Response("No setup call link configured", { status: 404 });
    const { subject, html } = setupCallNudgePreview(
      setupCallBookingUrl(link, "coach@example.com"),
      "backlog"
    );
    return new Response(`<!doctype html><title>${subject}</title>${html}`, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json({ configured: Boolean(link), count: await countBacklogNudges() });
}

/**
 * POST: send one batch (lib/setup-call-nudge.ts caps it). The page calls it
 * again until `remaining` is 0. Each person is claimed before their email
 * goes out, so a double click or two tabs never send anyone two.
 */
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!setupCallLink()) {
    return NextResponse.json({ error: "No setup call link configured" }, { status: 409 });
  }

  try {
    const result = await sendBacklogNudgeBatch();
    if (result.failures > 0) {
      console.error(
        `[EMAIL_ALERT] Backlog setup call email: ${result.failures} failed in a batch of ${result.candidates}.`
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Backlog setup call email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
