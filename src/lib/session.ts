import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

const SESSION_DURATION_DAYS = 7;

export async function createSessionAndSetCookie(userId: number) {
  const sessionToken = nanoid(32);
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DURATION_DAYS);

  // 1. บันทึก Session ลง Database (Stateful Session)
  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  // 2. ตั้งค่า Cookie ส่งกลับไปยังเบราว์เซอร์
  const cookieStore = await cookies();
  cookieStore.set("session_token", sessionToken, {
    httpOnly: true, // ป้องกัน XSS (ห้าม JS ฝั่ง Client เข้าถึง)
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // อนุญาตให้ส่ง Cookie ได้เมื่อ Redirect มาจาก Cross-site แบบ Top-level GET
    path: "/",
    expires,
  });

  return sessionToken;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (sessionToken) {
    await prisma.session.deleteMany({
      where: { sessionToken },
    });
  }

  cookieStore.delete("session_token");
}