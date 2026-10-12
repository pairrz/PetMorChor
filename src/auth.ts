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
      // รองรับทั้ง Google และ CPE OAuth
      if ((account?.provider === "google" || account?.provider === "cpe") && user.email) {
        const providerName = account.provider === "cpe" ? "cpe" : "google";
        const defaultName = account.provider === "cpe" ? "CPE Student" : "Google User";

        await prisma.user.upsert({
          where: {
            email: user.email,
          },
          update: {
            name: user.name ?? undefined,
            oauthProvider: providerName,
          },
          create: {
            name: user.name ?? defaultName,
            email: user.email,
            password: null,
            oauthProvider: providerName,
            role: "USER",
          },
        });
      }

      return true;
    },

    // แนะนำแนบ user ID (Int) เข้า JWT Token เพื่อให้ auth() ดึง id ไปใช้ง่ายๆ
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        // cast id ให้ตรงกับ Type ฝั่ง NextAuth
        session.user.id = token.sub;
      }
      return session;
    },
  },
});