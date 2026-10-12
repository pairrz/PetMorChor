import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const maxImageCount = 10;

const postSchema = z.object({
  caption: z.string().trim().min(1, "กรุณากรอกหัวข้อ").max(255),
  description: z
    .string()
    .trim()
    .min(5, "รายละเอียดต้องมีความยาวอย่างน้อย 5 ตัวอักษร")
    .max(2000, "รายละเอียดต้องยาวไม่เกิน 2,000 ตัวอักษร"),
  category: z.enum(["GENERAL", "LOST_PET", "ADOPTION"]),
  media: z
    .array(
      z.object({
        publicId: z.string().min(1).max(255),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      }),
    )
    .max(maxImageCount, `แนบรูปภาพได้สูงสุด ${maxImageCount} รูป`)
    .default([]),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนทำการโพสต์" },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "ข้อมูลโพสต์ไม่ถูกต้อง" }, { status: 400 });
    }

    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลโพสต์ไม่ถูกต้อง" },
        { status: 400 },
      );
    }
    const { media, ...fields } = parsed.data;

    // ต้องเป็นรูปที่ผู้ใช้คนนี้อัปโหลดเอง และห้ามซ้ำกัน
    const prefix = `petmorchor/${user.id}/post/`;
    const ids = media.map((m) => m.publicId);
    if (
      !ids.every((id) => id.startsWith(prefix)) ||
      new Set(ids).size !== ids.length
    ) {
      return NextResponse.json({ error: "ไฟล์รูปภาพไม่ถูกต้อง" }, { status: 400 });
    }

    const cloud = process.env.CLOUDINARY_CLOUD_NAME;

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        ...fields,
        media: {
          create: media.map((m, i) => ({
            // สร้าง URL ฝั่ง server เอง ไม่รับ url จาก client
            mediaUrl: `https://res.cloudinary.com/${cloud}/image/upload/${m.publicId}`,
            mediaType: "IMAGE",
            publicId: m.publicId,
            width: m.width,
            height: m.height,
            order: i,
          })),
        },
      },
    });

    return NextResponse.json(
      { success: true, message: "สร้างโพสต์สำเร็จ", data: post },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "ไฟล์รูปภาพไม่ถูกต้อง" }, { status: 400 });
    }
    console.error("POST /api/community/posts error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างโพสต์ได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 },
    );
  }
}