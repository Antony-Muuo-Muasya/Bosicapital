import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

if (!process.env.NEXTAUTH_SECRET) {
  console.warn("[Auth] WARNING: NEXTAUTH_SECRET is not set in environment variables!");
}

export const authOptions: NextAuthOptions = {
  // Removed PrismaAdapter as it's not needed for JWT + Credentials strategy without OAuth
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        console.log("[Auth] Attempting direct SQL authorize for:", credentials.email);

        // Fetch user with JOINs
        const users = await db(`
          SELECT u.*, r.name as "roleName", r."systemRole" as "roleSystemRole",
                 o.name as "orgName"
          FROM "User" u
          LEFT JOIN "Role" r ON u."roleId" = r.id
          LEFT JOIN "Organization" o ON u."organizationId" = o.id
          WHERE u.email = $1
        `, [credentials.email]);

        const user = users[0];

        if (!user || !user.password) {
          console.log("[Auth] User or password not found in DB");
          throw new Error("No user found with this email.");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          console.log("[Auth] Invalid password for user:", user.email);
          throw new Error("Invalid password.");
        }

        console.log("[Auth] Authorize successful for:", user.email);

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          roleId: user.roleId,
          organizationId: user.organizationId,
          role: { id: user.roleId, name: user.roleName, systemRole: user.roleSystemRole },
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roleId = (user as any).roleId;
        token.organizationId = (user as any).organizationId;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any).id = token.id;
        (session.user as any).roleId = token.roleId;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
};
