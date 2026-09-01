import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isLockedDemoAccount } from "@/lib/demo";
import { parseBody } from "@/lib/validations/parseBody";
import { updateProfileSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

/**
 * PUT /api/account/profile — display name and (for coaches) the bio shown
 * to invited clients on the signup page.
 *
 * Role-agnostic on purpose: name applies to any account, bio is silently
 * ignored for accounts without a coach profile, so a future client settings
 * page can call the same endpoint.
 */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await parseBody(req, updateProfileSchema);
  if (!result.success) return result.response;
  const { name, bio } = result.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, coachProfile: { select: { id: true } } },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      ...(bio !== undefined && user.coachProfile
        ? { coachProfile: { update: { bio: bio || null } } }
        : {}),
    },
    select: {
      name: true,
      coachProfile: { select: { bio: true } },
    },
  });

  return NextResponse.json({
    name: updated.name,
    bio: updated.coachProfile?.bio ?? null,
  });
}
