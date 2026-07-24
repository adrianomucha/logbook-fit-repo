import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isAdminEmail, isValidAdminToken } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Wrap a field in quotes and escape embedded quotes for safe CSV. */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Extracts the bearer token from an Authorization header, if present. */
function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Downloads the waitlist as CSV. Authorized two ways:
 *   1. A signed-in session whose email is on the ADMIN_EMAILS allowlist, or
 *   2. `Authorization: Bearer <WAITLIST_ADMIN_TOKEN>` for scripts / automation.
 *
 * The token is deliberately NOT accepted as a query parameter: URLs (including
 * query strings) end up in access logs, log drains, and browser history, which
 * would leak a static admin credential (CWE-598).
 */
export async function GET(req: Request) {
  const token = bearerToken(req);

  // Token path first, so scripts never depend on a session/next-auth secret.
  if (!isValidAdminToken(token)) {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const entries = await prisma.waitlistEntry.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      email: true,
      createdAt: true,
      source: true,
      medium: true,
      campaign: true,
      referrer: true,
      clientCount: true,
    },
  });

  const rows = [
    "email,joined,source,medium,campaign,referrer,clients",
    ...entries.map((e) =>
      [
        e.email,
        e.createdAt.toISOString(),
        e.source ?? "",
        e.medium ?? "",
        e.campaign ?? "",
        e.referrer ?? "",
        e.clientCount ?? "",
      ]
        .map(csvCell)
        .join(",")
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
