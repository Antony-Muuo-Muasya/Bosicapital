import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleId: string;
      organizationId: string;
      role?: any;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    roleId: string;
    organizationId: string;
    role?: any;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roleId: string;
    organizationId: string;
    role?: any;
  }
}
