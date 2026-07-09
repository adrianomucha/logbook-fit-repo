import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isAdminEmail, isValidAdminToken } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Wrap a field in quotes and escape embedded quotes for safe CSV. */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Downloads the waitlist as CSV. Authorized two ways:
 *   1. A signed-in session whose email is on the ADMIN_EMAILS allowlist, or
 *   2. ?token=<WAITLIST_ADMIN_TOKEN> for scripts / automation.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");

  // Token path first, so scripts never depend on a session/next-auth secret.
  if (!isValidAdminToken(token)) {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const entries = await prisma.waitlistEntry.findMany({
    orderBy: { createdAt: "desc" },
    select: { email: true, createdAt: true },
  });

  const rows = [
    "email,joined",
    ...entries.map(
      (e) => `${csvCell(e.email)},${csvCell(e.createdAt.toISOString())}`
    ),
  ];

  return new Response(rows.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="waitlist.csv"',
      "Cache-Control": "no-store",
    },
  });
}
