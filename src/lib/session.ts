import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  oauthProvider: true,
  createdAt: true,
  updatedAt: true,
};

/** ดึงข้อมูลผู้ใช้ปัจจุบัน (รองรับทั้ง Stateful DB Session และ Auth.js Session) */
export async function getCurrentUser() {
  try {
    // 1. ตรวจสอบผ่าน Stateful Session Cookie (session_token ใน PostgreSQL) ก่อน
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (sessionToken) {
      const dbSession = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: { select: userSelect } },
      });

      if (dbSession && dbSession.expires > new Date()) {
        return dbSession.user;
      }
    }

    // 2. Fallback: ตรวจสอบผ่าน Auth.js session (กรณี Google OAuth หรือ Credentials)
    const authSession = await auth();
    if (authSession?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: authSession.user.email },
        select: userSelect,
      });
      if (user) return user;
    }

    return null;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}