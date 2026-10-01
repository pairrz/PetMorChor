import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // หรือ import { prisma } ตามที่โปรเจกต์ export
import { nanoid } from "nanoid";

const SESSION_DURATION_DAYS = 7;
const SESSION_COOKIE_NAME = "session_token";

// Helper สำหรับคำนวณวันหมดอายุและ Cookie Options ตามมาตรฐาน
function getSessionCookieOptions(expires: Date) {
  return {
    httpOnly: true, // ป้องกัน XSS ห้าม JS ฝั่ง Client แอบอ่าน document.cookie[cite: 229]
    secure: process.env.NODE_ENV === "production", // บังคับ HTTPS ใน Production[cite: 228, 238]
    sameSite: "lax" as const, // รองรับ Top-level redirect เช่น กลับมาจาก Google OAuth[cite: 229, 252, 253]
    path: "/",
    expires,
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  };
}

/**
 * 1. สร้าง Session และผูกคุกกี้ผ่าน cookies() (ใช้ได้กับ Server Actions และ Route Handlers ทั่วไป)
 */
export async function createSessionAndSetCookie(userId: number) {
  const sessionToken = nanoid(32);
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DURATION_DAYS);

  // บันทึก Session ลง Database (Stateful Session ตาม Slide T09p3)[cite: 211, 236]
  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions(expires));

  return sessionToken;
}

/**
 * 2. สร้าง Session และผูกคุกกี้ลงบน NextResponse โดยตรง 
 * (จำเป็นมากสำหรับ OAuth 2.0 Callback ที่ใช้ NextResponse.redirect() หรือ API login ที่ส่ง NextResponse.json())
 */
export async function createSession(userId: number, response: NextResponse) {
  const sessionToken = nanoid(32);
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DURATION_DAYS);

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions(expires));

  return sessionToken;
}

/**
 * 3. Deserialization: ดึง Session และข้อมูลผู้ใช้ปัจจุบัน (ตาม Slide T09p3 หน้า 40, 44)
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) return null;

    // ค้นหา Session ใน DB ควบคู่กับการตรวจวันหมดอายุ
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true, // ถ้ามี
          },
        },
      },
    });

    // หากไม่มี Session หรือ Session หมดอายุแล้ว ให้ถือว่าไม่มีสิทธิ์
    if (!session || new Date() > session.expires) {
      if (session) {
        // ล้างขยะ Session ที่หมดอายุแล้วใน DB ทิ้ง
        await prisma.session.delete({ where: { sessionToken } }).catch(() => {});
      }
      return null;
    }

    return session.user;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

/**
 * 4. ทำลาย Session เมื่อออกจากระบบ (Revoke Session ออกจาก Database และเคลียร์ Cookie)[cite: 182, 220, 242]
 */
export async function destroySession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    // ลบออกจาก DB เพื่อไม่ให้ Token เดิมถูกนำกลับมาใช้ได้อีก (ป้องกัน Replay Attack)[cite: 220]
    await prisma.session.deleteMany({
      where: { sessionToken },
    });
  }

  // ลบ Cookie ออกจาก Browser
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * 5. ทำลาย Session ผ่าน NextResponse (สำหรับกรณีสั่ง Logout ผ่าน Route Handler)
 */
export async function destroySessionWithResponse(response: NextResponse) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await prisma.session.deleteMany({
      where: { sessionToken },
    });
  }

  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}