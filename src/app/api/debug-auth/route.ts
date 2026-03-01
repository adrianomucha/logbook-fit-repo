import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Temporary diagnostic endpoint — DELETE after debugging
export async function GET() {
  const checks: Record<string, unknown> = {};

  // 1. Can Prisma connect?
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.prismaConnection = "OK";
  } catch (e: unknown) {
    checks.prismaConnection = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    return NextResponse.json(checks, { status: 500 });
  }

  // 2. Do demo users exist?
  try {
    const users = await prisma.user.findMany({
      where: { email: { in: ["coach@logbook.fit", "client@logbook.fit"] } },
      select: { id: true, email: true, role: true, deletedAt: true, passwordHash: true },
    });
    checks.usersFound = users.map((u) => ({
      email: u.email,
      role: u.role,
      deletedAt: u.deletedAt,
      hashPrefix: u.passwordHash?.substring(0, 7) ?? "NO_HASH",
    }));

    // 3. Does bcrypt comparison work?
    for (const u of users) {
      if (u.passwordHash) {
        const match = await bcrypt.compare("demo1234", u.passwordHash);
        checks[`bcrypt_${u.email}`] = match ? "OK" : "MISMATCH";
      }
    }
  } catch (e: unknown) {
    checks.userQuery = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 4. Environment check
  checks.env = {
    hasDbUrl: !!process.env.DATABASE_URL,
    hasDirectUrl: !!process.env.DIRECT_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL ?? "NOT_SET",
    nodeEnv: process.env.NODE_ENV,
  };

  return NextResponse.json(checks);
}
