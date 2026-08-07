import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isLockedDemoAccount } from "@/lib/demo";

export async function middleware(request: NextRequest) {
  // Public landing page. Signed-in visitors go straight to the app (the PWA's
  // start_url is "/"), but everyone else must get the marketing page. Only the
  // session cookie's *presence* is checked — no secret, no database — so this
  // stays cheap and works in any environment. Doing it here instead of in the
  // page keeps src/app/page.tsx free of cookies(), which is what lets Next.js
  // statically prerender it and serve it from the CDN to crawlers.
  // /coach's own check below verifies the token properly, bouncing clients to
  // /client and stale sessions to /login.
  if (request.nextUrl.pathname === '/') {
    const hasSession =
      request.cookies.has('__Secure-next-auth.session-token') ||
      request.cookies.has('next-auth.session-token');
    return hasSession
      ? NextResponse.redirect(new URL('/coach', request.url))
      : NextResponse.next();
  }

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

  // /admin only needs the signed-out → login redirect here (with callbackUrl,
  // handled above, so the admin lands back where they were going). The
  // allowlist check itself stays in the admin layout: signed-in non-admins
  // still get its plain 404, which keeps these routes unadvertised.
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/coach/:path*", "/client/:path*", "/admin/:path*"],
};
