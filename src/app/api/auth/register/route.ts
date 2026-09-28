import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password"; // ฟังก์ชัน bcrypt.hash(password, 10) ที่ทำไว้
import { createSessionAndSetCookie } from "@/lib/session";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().trim().min(2, "ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร"),
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, email, password } = validation.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, message: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 400 });
    }

    // เข้ารหัสด้วย bcrypt (Cost Factor 10)
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // สมัครเสร็จแล้วให้ล็อกอินอัตโนมัติ
    await createSessionAndSetCookie(user.id);

    return NextResponse.json({ success: true, message: "สมัครสมาชิกสำเร็จ" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}