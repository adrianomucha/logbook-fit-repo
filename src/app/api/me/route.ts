import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { isDemoAccount, isLockedDemoAccount } from "@/lib/demo";
import prisma from "@/lib/prisma";
import { verifyCredentials } from "@/lib/credentials";
import { getClientIp } from "@/lib/rate-limit";
import { AccountNotFoundError, deleteAccount } from "@/lib/account-deletion";
import { parseBody } from "@/lib/validations/parseBody";
import { deleteAccountSchema } from "@/lib/validations/schemas";

export async function GET() {
  const session = await getSession();
  if (!session || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      linkedUserId: true,
      coachProfile: {
        select: {
          id: true,
          bio: true,
        },
      },
      clientProfile: {
        select: {
          id: true,
          activePlanId: true,
          planStartDate: true,
          coachRelationship: {
            select: {
              status: true,
              coach: {
                select: {
                  id: true,
                  user: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // An ended relationship means "no coach" everywhere in the client app —
  // don't leak the old coach into the payload
  const clientProfile = user.clientProfile
    ? {
        ...user.clientProfile,
        coachRelationship:
          user.clientProfile.coachRelationship?.status === "ACTIVE"
            ? user.clientProfile.coachRelationship
            : null,
      }
    : null;

  // The paired account for the nav's one-click switch — only surfaced when
  // it could actually be switched into (exists, live, not demo-locked).
  let linkedAccount: { role: "COACH" | "CLIENT"; name: string } | null = null;
  if (user.linkedUserId) {
    const linked = await prisma.user.findFirst({
      where: { id: user.linkedUserId, deletedAt: null },
      select: { role: true, name: true, email: true },
    });
    if (linked && !isLockedDemoAccount(linked.email)) {
      linkedAccount = { role: linked.role, name: linked.name };
    }
  }

  return NextResponse.json({
    ...user,
    clientProfile,
    linkedAccount,
    // Lets the nav show the Admin entry point. Informational only — every
    // /admin page and API independently re-checks the allowlist server-side.
    isAdmin: isAdminEmail(session.user.email),
  });
}

/**
 * DELETE /api/me — the signed-in person retires their own account.
 *
 * Password re-entry is the confirmation: an open laptop or a borrowed phone
 * must not be enough to delete someone. The check runs through the same
 * path as sign-in (lib/credentials.ts), so it is rate-limited the same way.
 * Demo accounts are shared fixtures and can't be deleted by anyone.
 *
 * What deletion does is in lib/account-deletion.ts. The response is the
 * caller's cue to drop its session — the cookie or token stops working
 * regardless, since getSession() refuses deleted users.
 */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || isLockedDemoAccount(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isDemoAccount(session.user.email)) {
    return NextResponse.json(
      { error: "Demo accounts can't be deleted" },
      { status: 403 }
    );
  }

  const result = await parseBody(req, deleteAccountSchema);
  if (!result.success) return result.response;

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, deletedAt: null },
    select: { id: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const check = await verifyCredentials({
    email: user.email,
    password: result.data.password,
    ip: getClientIp(req),
  });
  if (!check.ok) {
    if (check.reason === "rate_limited") {
      return NextResponse.json(
        { error: "Too many attempts. Try again in a few minutes." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "That password doesn't match" },
      { status: 403 }
    );
  }

  try {
    const summary = await deleteAccount(user.id);
    console.log(
      `[ACCOUNT] Deleted ${summary.role} account ${user.id}: ` +
        `${summary.relationshipsEnded} relationship(s) ended, ` +
        `${summary.invitesRevoked} invite(s) revoked`
    );
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof AccountNotFoundError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[ACCOUNT_ALERT] Account deletion failed:", user.id, error);
    return NextResponse.json(
      { error: "Couldn't delete the account. Nothing was changed." },
      { status: 500 }
    );
  }
}
