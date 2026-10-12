import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    // 1. ถ้ามี session_token ใน DB ให้ลบข้อมูลในตาราง Session ทิ้ง
    if (sessionToken) {
      await prisma.session.deleteMany({
        where: { sessionToken },
      });
    }

    // 2. เคลียร์ Session ฝั่ง Auth.js (กรณีล็อกอินด้วย Google)
    try {
      await signOut({ redirect: false });
    } catch {
      // ดัก error เผื่อกรณีที่ไม่ได้ล็อกอินผ่าน Auth.js
    }

    // 3. สร้าง Response และสั่งลบคุกกี้ session_token บนเบราว์เซอร์
    const response = NextResponse.json({
      success: true,
      message: "ออกจากระบบเรียบร้อย",
    });

    response.cookies.delete("session_token");

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการออกจากระบบ" },
      { status: 500 }
    );
  }
}