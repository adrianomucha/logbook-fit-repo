import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Not authenticated → redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const path = request.nextUrl.pathname;

  // Role-based route protection (roles stored as uppercase in DB: "COACH", "CLIENT")
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
