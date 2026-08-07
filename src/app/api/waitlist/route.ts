import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseBody } from "@/lib/validations/parseBody";
import { waitlistSchema, waitlistQualifySchema } from "@/lib/validations/schemas";
import { waitlistLimiter, getClientIp } from "@/lib/rate-limit";
import { sendWaitlistWelcome } from "@/lib/services/email";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { allowed } = await waitlistLimiter(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const result = await parseBody(req, waitlistSchema);
    if (!result.success) return result.response;

    const { email, source, medium, campaign, referrer } = result.data;

    // An email with a live account has nothing to wait for — send its owner
    // to the sign-in instead of parking them on the list. This does disclose
    // that the email is registered, but signup's "Email already registered"
    // response discloses the same thing, so it opens no new enumeration
    // channel. (Repeat WAITLIST signups below stay a quiet no-op — being on
    // the list is not an account and stays undisclosed.)
    const registered = await prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    });
    if (registered) {
      return NextResponse.json({ error: "already_registered" }, { status: 409 });
    }

    // Only the first signup for an email creates a row; repeats are quiet
    // no-ops so the response never reveals whether an email was already on
    // the list. `createMany({ skipDuplicates })` tells us if a row was added.
    const { count } = await prisma.waitlistEntry.createMany({
      data: [{ email, source, medium, campaign, referrer }],
      skipDuplicates: true,
    });

    // Send the confirmation only on a genuinely new signup, and only as a
    // best-effort side effect — a mail failure must not fail the request.
    if (count > 0) {
      await sendWaitlistWelcome(email);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Waitlist signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Records the qualifying answer from the confirmation screen ("how many
 * clients are you coaching right now?"). Split from POST because it happens
 * after the signup is already saved — a coach who ignores the question is
 * still on the list.
 *
 * Always answers 204, whether or not a row matched, so the endpoint can't be
 * used to test which emails are on the list. The trade-off is that someone
 * who guesses a signup's email could overwrite that entry's bucket; the field
 * is coarse segmentation for ordering invite batches, never access control,
 * so a wrong value costs an ordering hint and nothing more.
 */
export async function PATCH(req: Request) {
  try {
    const ip = getClientIp(req);
    const { allowed } = await waitlistLimiter(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const result = await parseBody(req, waitlistQualifySchema);
    if (!result.success) return result.response;

    const { email, clientCount } = result.data;

    await prisma.waitlistEntry.updateMany({
      where: { email },
      data: { clientCount },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Waitlist qualify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
