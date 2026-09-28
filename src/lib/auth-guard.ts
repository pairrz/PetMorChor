import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

export async function getSessionUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  const sessionToken = req.cookies.get("session_token")?.value;
  if (!sessionToken) return null;

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
  if (!session || session.expires < new Date()) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as "USER" | "ADMIN",
  };
}