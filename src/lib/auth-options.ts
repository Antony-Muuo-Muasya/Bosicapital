
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

if (!process.env.NEXTAUTH_SECRET) {
  console.warn("[Auth] WARNING: NEXTAUTH_SECRET is not set in environment variables!");
}

export const authOptions: NextAuthOptions = {
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

        console.log("[Auth] Attempting authorize for:", credentials.email);

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { role: true, organization: true },
        });

        if (!user || !(user as any).password) {
          console.log("[Auth] User or password not found in DB");
          throw new Error("No user found with this email.");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          (user as any).password
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
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log("[Auth] Populating JWT token for user:", user.email);
        token.id = user.id;
        token.roleId = (user as any).roleId;
        token.organizationId = (user as any).organizationId;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        console.log("[Auth] Populating session for token ID:", token.id);
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
