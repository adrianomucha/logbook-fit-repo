import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { isLockedDemoAccount } from "@/lib/demo";
import { parseBody } from "@/lib/validations/parseBody";
import { timezoneSchema } from "@/lib/validations/schemas";
import { isValidTimeZone } from "@/lib/timezone";

export const dynamic = "force-dynamic";

/**
 * PUT /api/account/timezone — record the browser's IANA timezone.
 *
 * Called fire-and-forget by TimezoneSync on app load, so User.timezone
 * follows the person as they travel or change devices. The check-in
 * scheduler reads it to anchor weekday cadences to the client's local day.
 */
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await parseBody(req, timezoneSchema);
  if (!result.success) return result.response;
  const { timezone } = result.data;

  // Zod only bounds the string — whether it names a real zone is a runtime
  // question for the Intl database
  if (!isValidTimeZone(timezone)) {
    return NextResponse.json({ error: "Unknown timezone" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { timezone },
    select: { id: true },
  });

  return NextResponse.json({ timezone });
}
