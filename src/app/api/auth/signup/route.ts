import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { QUICK_START_EXERCISES } from "@/lib/quick-start-exercises";
import { parseBody } from "@/lib/validations/parseBody";
import { signupSchema } from "@/lib/validations/schemas";
import { signupLimiter, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // Rate limit by IP
    const ip = getClientIp(req);
    const { allowed } = signupLimiter(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429 }
      );
    }

    const result = await parseBody(req, signupSchema);
    if (!result.success) return result.response;

    const { email, password, name, role, inviteToken } = result.data;

    // If invite token provided, validate it and force CLIENT role
    let invite: { id: string; coachId: string; email: string | null } | null = null;
    let effectiveRole = role;

    if (inviteToken) {
      const found = await prisma.clientInvite.findUnique({
        where: { token: inviteToken },
      });

      if (!found || found.status !== 'PENDING' || found.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Invite link is invalid or expired" },
          { status: 400 }
        );
      }

      // If invite has a pre-filled email, it must match
      if (found.email && found.email.toLowerCase() !== email) {
        return NextResponse.json(
          { error: "Email does not match the invite" },
          { status: 400 }
        );
      }

      invite = { id: found.id, coachId: found.coachId, email: found.email };
      effectiveRole = "CLIENT"; // Always CLIENT when using invite
    }

    // Validate role (invite forces CLIENT, otherwise must be provided and valid)
    if (effectiveRole !== "COACH" && effectiveRole !== "CLIENT") {
      return NextResponse.json(
        { error: "Role must be COACH or CLIENT" },
        { status: 400 }
      );
    }

    // Check for existing active user with this email
    const existing = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user + profile in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: effectiveRole!,
          ...(effectiveRole === "COACH"
            ? { coachProfile: { create: {} } }
            : { clientProfile: { create: {} } }),
        },
        include: {
          coachProfile: effectiveRole === "COACH",
          clientProfile: effectiveRole === "CLIENT",
        },
      });

      // For coaches: clone Quick Start exercises into their library
      if (effectiveRole === "COACH" && newUser.coachProfile) {
        await tx.exercise.createMany({
          data: QUICK_START_EXERCISES.map((ex) => ({
            coachId: newUser.coachProfile!.id,
            name: ex.name,
            category: ex.category,
            defaultSets: ex.defaultSets,
            defaultReps: ex.defaultReps,
            defaultRest: ex.defaultRest,
          })),
        });
      }

      // For invite-based signups: create coach-client relationship + accept invite
      if (invite && newUser.clientProfile) {
        await tx.coachClientRelationship.create({
          data: {
            coachId: invite.coachId,
            clientId: newUser.clientProfile.id,
            status: 'ACTIVE',
          },
        });

        await tx.clientInvite.update({
          where: { id: invite.id },
          data: { status: 'ACCEPTED' },
        });
      }

      return newUser;
    });

    // Return user without passwordHash
    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        ...(user.coachProfile
          ? { coachProfileId: user.coachProfile.id }
          : {}),
        ...("clientProfile" in user && user.clientProfile
          ? { clientProfileId: user.clientProfile.id }
          : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
