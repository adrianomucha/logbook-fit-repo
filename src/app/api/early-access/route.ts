import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { parseBody } from "@/lib/validations/parseBody";
import { earlyAccessSchema } from "@/lib/validations/schemas";
import { earlyAccessLimiter, getClientIp } from "@/lib/rate-limit";

/**
 * Public early-access / waitlist capture for the marketing landing page.
 * No auth — a visitor leaves an email before they have an account.
 *
 * Idempotent by design: re-submitting an address that's already on the list
 * returns 200 with `alreadyOnList: true` rather than an error, so the UI can
 * always show a friendly confirmation.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { allowed } = earlyAccessLimiter(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a little while." },
        { status: 429 }
      );
    }

    const result = await parseBody(req, earlyAccessSchema);
    if (!result.success) return result.response;

    const { email, name, role, referrer } = result.data;

    try {
      await prisma.earlyAccessSignup.create({
        data: {
          email,
          name: name || null,
          role: role ?? null,
          referrer: referrer || null,
        },
      });
    } catch (error) {
      // Unique-email violation → already signed up. Treat as success.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json({ ok: true, alreadyOnList: true });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, alreadyOnList: false }, { status: 201 });
  } catch (error) {
    console.error("Early-access signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
