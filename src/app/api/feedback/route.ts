import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { isLockedDemoAccount } from "@/lib/demo";
import { parseBody } from "@/lib/validations/parseBody";
import { feedbackSchema } from "@/lib/validations/schemas";
import { feedbackLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/feedback — product feedback from the account menu's dialog.
 *
 * Open to any signed-in account, coach or client: the whole point is a
 * zero-friction channel to the owner, so there's no role wrapper and no
 * relationship check. Reviewed on /admin/feedback.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Keyed by user id, not IP — feedback is authenticated, and one shared
  // gym Wi-Fi shouldn't starve everyone's ability to report a bug.
  const { allowed } = await feedbackLimiter(session.user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "You're sending feedback faster than we can read it — try again in a bit" },
      { status: 429 }
    );
  }

  const result = await parseBody(req, feedbackSchema);
  if (!result.success) return result.response;
  const { category, message, pageUrl } = result.data;

  // The session type carries role as a plain string — narrow it to the enum
  // rather than casting, so a malformed token can't write a bad row
  const role = session.user.role === "COACH" ? "COACH" : "CLIENT";

  await prisma.feedback.create({
    data: {
      userId: session.user.id,
      role,
      category,
      message,
      pageUrl: pageUrl || null,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
