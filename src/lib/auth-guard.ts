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
  void req;
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