import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

export async function getSessionUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  const sessionToken = req.cookies.get("session_token")?.value;
  if (sessionToken) {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    // ตรวจสอบว่ามี session หรือหมดอายุแล้วหรือไม่
    if (session && session.expires >= new Date()) {
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role as "USER" | "ADMIN",
      };
    }
  }

  // Google login uses Auth.js cookies; resolve that session to the local user.
  const authSession = await auth();
  if (!authSession?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: authSession.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "USER" | "ADMIN",
  };
}