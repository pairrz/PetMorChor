// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/password"; // ฟังก์ชัน bcrypt.compare
import { createSession } from "@/lib/session";     // บันทึก session ลง DB และสร้างคุกกี้
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ success: false, message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const { email, password } = result.data;

    // ค้นหาผู้ใช้จากอีเมล
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return NextResponse.json({ success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    // ตรวจสอบรหัสผ่านผ่าน bcrypt Cost factor 10
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    // สร้าง Stateful Session ใน DB และตั้งค่า HttpOnly Cookie
    const response = NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    await createSession(user.id, response); // ตั้งค่า Set-Cookie ลง Header ของ response

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" }, { status: 500 });
  }
}