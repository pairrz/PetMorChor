import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user?.password || !(await comparePassword(password, user.password))) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        await prisma.user.upsert({
          where: {
            email: user.email,
          },
          update: {
            name: user.name ?? undefined,
            oauthProvider: "google",
          },
          create: {
            name: user.name ?? "Google User",
            email: user.email,
            password: null,
            oauthProvider: "google",
            role: "USER",
          },
        });
      }

      return true;
    },
  },
});