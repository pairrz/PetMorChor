import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPostsQuerySchema, createPostSchema } from "@/lib/validations/post";
import { getSessionUser } from "@/lib/auth-guard";

// GET /api/posts - ดึงรายการโพสต์ฟีดอวดสัตว์เลี้ยง
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // 1. ตรวจสอบ Query Parameters ด้วย Zod[cite: 1]
    const parsedQuery = getPostsQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return NextResponse.json(
        { success: false, errors: parsedQuery.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { limit, cursor } = parsedQuery.data;

    // 2. Query ดึงโพสต์ พร้อมสื่อ (Media), ข้อมูลผู้โพสต์ และสถิติ Like/Comment
    const posts = await prisma.post.findMany({
      take: limit + 1, // ดึงเกินมา 1 เพื่อใช้คำนวณ nextCursor
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // ข้ามตัว cursor ตัวปัจจุบัน
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true }, // ป้องกันการส่ง email/password ออกไป
        },
        media: {
          select: { id: true, mediaUrl: true, mediaType: true },
        },
        _count: {
          select: { likes: true, comments: true }, // นับจำนวนไลก์และคอมเมนต์
        },
      },
    });

    let nextCursor: number | null = null;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem ? nextItem.id : null;
    }

    return NextResponse.json(
      {
        success: true,
        data: posts,
        pagination: { nextCursor },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/posts error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการโหลดโพสต์" },
      { status: 500 }
    );
  }
}

// POST /api/posts - สร้างโพสต์อวดสัตว์เลี้ยง
export async function POST(req: NextRequest) {
  try {
    // 1. ตรวจสอบ Identity ของผู้ใช้จาก Session[cite: 5, 7]
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "กรุณาเข้าสู่ระบบก่อนทำการโพสต์" },
        { status: 401 }
      );
    }

    // 2. Validate payload ผ่าน Zod[cite: 1]
    const body = await req.json();
    const validation = createPostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { caption, description, media } = validation.data;

    // 3. ใช้ Nested Write ของ Prisma เพื่อสร้าง Post และ PostMedia พร้อมกันในคราวเดียว[cite: 2]
    const newPost = await prisma.post.create({
      data: {
        caption,
        description,
        userId: user.id,
        media: {
          create: media.map((item) => ({
            mediaUrl: item.mediaUrl,
            mediaType: item.mediaType,
          })),
        },
      },
      include: {
        user: { select: { id: true, name: true } },
        media: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "สร้างโพสต์สำเร็จ",
        data: newPost,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json(
      { success: false, message: "ไม่สามารถสร้างโพสต์ได้" },
      { status: 500 }
    );
  }
}