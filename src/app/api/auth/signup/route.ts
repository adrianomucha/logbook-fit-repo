import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { QUICK_START_EXERCISES } from "@/lib/quick-start-exercises";
import { parseBody } from "@/lib/validations/parseBody";
import { signupSchema } from "@/lib/validations/schemas";
import { signupLimiter, getClientIp } from "@/lib/rate-limit";
import { isCoachSignupOpen } from "@/lib/waitlist";
import { notifyClientJoined } from "@/lib/push";

// Thrown inside the signup transaction when a beta invite was redeemed by a
// concurrent signup between validation and commit; rolls the account back.
class BetaInviteRedeemedError extends Error {}

export async function POST(req: Request) {
  try {
    // Rate limit by IP
    const ip = getClientIp(req);
    const { allowed } = await signupLimiter(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429 }
      );
    }

    const result = await parseBody(req, signupSchema);
    if (!result.success) return result.response;

    const { email, password, name, role, inviteToken, betaToken } =
      result.data;

    // If invite token provided, validate it and force CLIENT role
    let invite: {
      id: string;
      coachId: string;
      coachUserId: string;
      email: string | null;
      note: string | null;
    } | null = null;
    let effectiveRole = role;

    if (inviteToken) {
      const found = await prisma.clientInvite.findUnique({
        where: { token: inviteToken },
        include: { coach: { select: { userId: true } } },
      });

      if (!found || found.status !== 'PENDING' || found.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Invite link is invalid or expired" },
          { status: 400 }
        );
      }

      // The token is the credential (single-use, expiring) — a coach-typed
      // email is a convenience pre-fill, not an identity check. Enforcing an
      // exact match would strand clients behind a coach's typo.
      invite = {
        id: found.id,
        coachId: found.coachId,
        coachUserId: found.coach.userId,
        email: found.email,
        note: found.note,
      };
      effectiveRole = "CLIENT"; // Always CLIENT when using invite
    }

    // Validate role (invite forces CLIENT, otherwise must be provided and valid)
    if (effectiveRole !== "COACH" && effectiveRole !== "CLIENT") {
      return NextResponse.json(
        { error: "Role must be COACH or CLIENT" },
        { status: 400 }
      );
    }

    // Coach signups are invite-only during the private beta: a valid waitlist
    // invite unlocks account creation (and is redeemed in the transaction
    // below). OPEN_COACH_SIGNUP=true lifts the gate for local dev or launch.
    // A presented token is always validated — even with the gate open — so a
    // stale link fails loudly instead of quietly minting an ungated account.
    let waitlistEntryId: string | null = null;
    if (effectiveRole === "COACH") {
      if (betaToken) {
        const entry = await prisma.waitlistEntry.findUnique({
          where: { inviteToken: betaToken },
          select: { id: true, status: true },
        });
        if (!entry || entry.status !== "INVITED") {
          return NextResponse.json(
            { error: "Invite link is invalid or already used" },
            { status: 400 }
          );
        }
        waitlistEntryId = entry.id;
      } else if (!isCoachSignupOpen()) {
        return NextResponse.json(
          {
            error:
              "Coach signup is invite-only during the beta. Join the waitlist and we'll email your invite.",
          },
          { status: 403 }
        );
      }
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
            trackingType: ex.trackingType ?? "REPS",
            defaultSets: ex.defaultSets,
            defaultReps: ex.defaultReps,
            defaultRest: ex.defaultRest,
          })),
        });
      }

      // Redeem the beta invite atomically with the account: the status guard
      // makes the token single-use even under concurrent signups — the loser
      // hits count 0 and their whole signup rolls back.
      if (waitlistEntryId) {
        const { count } = await tx.waitlistEntry.updateMany({
          where: { id: waitlistEntryId, status: "INVITED" },
          data: { status: "JOINED", joinedAt: new Date() },
        });
        if (count === 0) {
          throw new BetaInviteRedeemedError();
        }
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

        // The coach's invite note becomes their first chat message, so the
        // client's inbox opens with the coach's own words already waiting
        if (invite.note) {
          await tx.message.create({
            data: {
              senderId: invite.coachUserId,
              recipientId: newUser.id,
              content: invite.note,
            },
          });
        }
      }

      return newUser;
    });

    // Tell the coach their invited client is here. Outside the transaction:
    // a push failure must never roll back a created account. The coach
    // otherwise had no signal at all — the new client just appeared on the
    // roster whenever they next reloaded.
    if (invite && "clientProfile" in user && user.clientProfile) {
      await notifyClientJoined({
        coachUserId: invite.coachUserId,
        clientName: user.name,
        clientProfileId: user.clientProfile.id,
      });
    }

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
    if (error instanceof BetaInviteRedeemedError) {
      return NextResponse.json(
        { error: "Invite link is invalid or already used" },
        { status: 400 }
      );
    }
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
