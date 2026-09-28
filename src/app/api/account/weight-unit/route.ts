import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { isLockedDemoAccount } from "@/lib/demo";
import { parseBody } from "@/lib/validations/parseBody";
import { weightUnitSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

/**
 * PUT /api/account/weight-unit — the kg/lb switch in Settings.
 *
 * Display only: stored weights are always lb, and each app converts to this
 * unit when it shows or reads a weight (packages/shared/src/weight-units.ts).
 * Flipping it never rewrites a single stored number.
 */
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await parseBody(req, weightUnitSchema);
  if (!result.success) return result.response;
  const { weightUnit } = result.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { weightUnit },
    select: { id: true },
  });

  return NextResponse.json({ weightUnit });
}
