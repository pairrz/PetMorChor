import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPostsQuerySchema, createPostSchema } from "@/lib/validations/post";
import { getSessionUser } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // 1. ตรวจสอบ Query Parameters ด้วย Zod
    const parsedQuery = getPostsQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return NextResponse.json(
        { success: false, errors: parsedQuery.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { limit = 10, cursor, category } = parsedQuery.data;

    // ตรวจสอบ Session เพื่อเช็ค isLiked (Visitor จะได้ null)
    const session = await getSession(req);
    const currentUserId = session?.userId;

    // 2. ถอดรหัส Composite Cursor (Base64 -> JSON)
    let decodedCursor: DecodedCursor | null = null;
    if (cursor) {
      try {
        decodedCursor = JSON.parse(
          Buffer.from(cursor, "base64").toString("utf-8")
        );
      } catch {
        return NextResponse.json(
          { success: false, message: "Invalid cursor token" },
          { status: 400 }
        );
      }
    }

    // 3. กำหนด Where Clause สำหรับ Priority + Cursor Pagination
    const whereCondition: any = {
      ...(category ? { category } : {}),
    };

    if (decodedCursor) {
      const cursorDate = new Date(decodedCursor.createdAt);
      whereCondition.OR = [
        // ลำดับ 1: โพสต์ธรรมดาหลังหมดกลุ่ม Pinned
        {
          isPinned: { lt: decodedCursor.isPinned },
        },
        // ลำดับ 2: กลุ่มความสำคัญเดียวกัน แต่เวลาเก่าวัดจาก Cursor
        {
          isPinned: decodedCursor.isPinned,
          createdAt: { lt: cursorDate },
        },
        // ลำดับ 3: กลุ่มความสำคัญและเวลาเท่ากัน ใช้ ID เป็น Tie-breaker
        {
          isPinned: decodedCursor.isPinned,
          createdAt: cursorDate,
          id: { lt: decodedCursor.id },
        },
      ];
    }

    // 4. Query ดึงโพสต์
    const posts = await prisma.post.findMany({
      take: limit + 1,
      where: whereCondition,
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        media: {
          select: { id: true, mediaUrl: true, mediaType: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
        // เช็คว่า User ปัจจุบันเคยกดไลก์หรือไม่
        likes: currentUserId
          ? {
              where: { userId: currentUserId },
              select: { id: true },
            }
          : false,
      },
    });

    // 5. คำนวณ Next Cursor และจัด Format ข้อมูล
    let nextCursor: string | null = null;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      if (nextItem) {
        const payload: DecodedCursor = {
          isPinned: nextItem.isPinned,
          createdAt: nextItem.createdAt.toISOString(),
          id: nextItem.id,
        };
        nextCursor = Buffer.from(JSON.stringify(payload)).toString("base64");
      }
    }

    // แปลงโครงสร้างให้ Front-end ใช้งานง่าย (ส่ง boolean isLiked แทน raw array)
    const formattedPosts = posts.map(({ likes, ...post }) => ({
      ...post,
      isLiked: Array.isArray(likes) && likes.length > 0,
    }));

    return NextResponse.json(
      {
        success: true,
        data: formattedPosts,
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