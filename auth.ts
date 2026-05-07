import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image?: string | null;
      role: string;
    };
  }
}

function stringJwtClaim(token: unknown, key: string): string | undefined {
  if (!token || typeof token !== "object") return undefined;
  const value = (token as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

const secret = process.env.AUTH_SECRET;
if (!secret && process.env.NODE_ENV !== "test") {
  console.warn(
    "[auth] AUTH_SECRET is not set. JWT sessions may fail. Add AUTH_SECRET to .env (e.g. run: openssl rand -base64 32)"
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret,
  logger: {
    error(code, ...message) {
      // Suppress JWT/session decryption errors — stale cookies are handled
      // gracefully by redirecting through /api/clear-auth in each layout.
      if (String(code).includes("JWT") || String(code).includes("Session")) return;
      console.error("[auth]", code, ...message);
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.password) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = stringJwtClaim(token, "id") ?? "";
        session.user.role = stringJwtClaim(token, "role") ?? "FARMER";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
