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
    } & DefaultSession["user"];
    /** Epoch seconds this login signed in; see lib/session-validity.ts. */
    authTime?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: string;
    userId?: string;
    /** Epoch seconds this login signed in; see lib/session-validity.ts. */
    authTime?: number;
  }
}
