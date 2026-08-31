import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { parseBody } from "@/lib/validations/parseBody";
import { feedbackStatusSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/feedback/[id] — move a feedback entry through its
 * lifecycle (NEW → REVIEWED → RESOLVED, or back). Owner-only, session
 * auth only: unlike the waitlist endpoints there's no script use case,
 * so no bearer-token path.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await parseBody(req, feedbackStatusSchema);
    if (!result.success) return result.response;

    const { id } = await params;
    try {
      await prisma.feedback.update({
        where: { id },
        data: { status: result.data.status },
        select: { id: true },
      });
    } catch (e) {
      // P2025: no row with that id — a stale admin tab, not a server fault
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      throw e;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin feedback update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
