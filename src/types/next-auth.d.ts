import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      /** Owner-only surfaces. Derived server-side from the ADMIN_EMAILS allowlist. */
      isAdmin: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: string;
    userId?: string;
    isAdmin?: boolean;
  }
}
