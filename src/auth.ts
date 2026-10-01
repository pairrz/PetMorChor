import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

const SESSION_DURATION_DAYS = 7;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        // 1. สร้างหรือหา User ใน Prisma
        const dbUser = await prisma.user.upsert({
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

        // 2. สร้าง custom Session
        const sessionToken = nanoid(32);

        const expires = new Date();
        expires.setDate(
          expires.getDate() + SESSION_DURATION_DAYS
        );

        await prisma.session.create({
          data: {
            sessionToken,
            userId: dbUser.id,
            expires,
          },
        });

        console.log("Google DB user:", dbUser);
        console.log("Custom session created:", sessionToken);
      }

      return true;
    },
  },
});