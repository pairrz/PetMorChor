import bcrypt from "bcrypt";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { auth } from "@/auth"; // หรือ import { auth } ตามที่โปรเจกต์ export  

const SALT_ROUNDS = 10

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// สร้าง Session ลงใน Database และส่ง Cookie กลับไป
export async function createSession(userId: number) {
  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 วัน

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("session_token", sessionToken, {
    httpOnly: true, // ป้องกัน XSS (สไลด์ Part 3 หน้า 23)
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // สไลด์ Part 3 หน้า 46-47
    path: "/",
    expires,
  });
}

export async function getCurrentUser() {
  try {
    // 1. เช็ก custom session ก่อน
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;

    if (token) {
      const session = await prisma.session.findUnique({
        where: {
          sessionToken: token,
        },
        include: {
          user: true,
        },
      });

      if (session) {
        if (session.expires < new Date()) {
          await prisma.session.delete({
            where: {
              sessionToken: token,
            },
          });

          return null;
        }

        return session.user;
      }
    }

    // 2. ถ้าไม่มี custom session ให้เช็ก Auth.js
    const authSession = await auth();

    if (!authSession?.user?.email) {
      return null;
    }

    // 3. หา User จาก email
    const user = await prisma.user.findUnique({
      where: {
        email: authSession.user.email,
      },
    });

    return user;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}