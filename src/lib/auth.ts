import bcrypt from "bcrypt";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

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

// ดึง Current User (หรือ null ถ้าเป็น Visitor)
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });

  if (!session || session.expires < new Date()) {
    return null;
  }

  return session.user;
}