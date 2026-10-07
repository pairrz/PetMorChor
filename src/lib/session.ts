import { prisma } from "@/lib/prisma"; // หรือ import { prisma } ตามที่โปรเจกต์ export
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

/** ดึงข้อมูลผู้ใช้ปัจจุบันจาก Auth.js session */
export async function getCurrentUser() {
  try {
    const authSession = await auth();

    if (!authSession?.user?.email) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: {
        email: authSession.user.email,
      },
      select: userSelect,
    });

    return user;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}
