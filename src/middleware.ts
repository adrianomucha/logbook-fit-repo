import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isLockedDemoAccount } from "@/lib/demo";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Not authenticated → redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Demo sessions are 30-day JWTs, so ones issued while demo mode was on
  // outlive turning it off — reject them here (no callbackUrl: there's
  // nothing for a locked demo account to come back to).
  if (isLockedDemoAccount(token.email)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const path = request.nextUrl.pathname;

  // Role-based route protection. Roles are stored uppercase (UserRole enum:
  // COACH/CLIENT) everywhere — see prisma schema, seed.ts, and withAuth.ts.
  if (path.startsWith("/coach") && token.role !== "COACH") {
    return NextResponse.redirect(new URL("/client", request.url));
  }

  if (path.startsWith("/client") && token.role !== "CLIENT") {
    return NextResponse.redirect(new URL("/coach", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/coach/:path*", "/client/:path*"],
};
