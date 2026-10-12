import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getPostsQuerySchema, createPostSchema } from "@/lib/validations/post";
import { getSessionUser } from "@/lib/auth-guard";

interface DecodedCursor {
  isPinned: boolean;
  createdAt: string;
  id: number;
}

// GET /api/posts - ดึงฟีดโพสต์
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
    const session = await getSessionUser(req);
    const currentUserId = session?.id;

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
    const whereCondition: Prisma.PostWhereInput = {
      ...(category ? { category } : {}),
    };

    if (decodedCursor) {
      const cursorDate = new Date(decodedCursor.createdAt);
      const cursorConditions: Prisma.PostWhereInput[] = [
        {
          isPinned: decodedCursor.isPinned,
          createdAt: { lt: cursorDate },
        },
        {
          isPinned: decodedCursor.isPinned,
          createdAt: cursorDate,
          id: { lt: decodedCursor.id },
        },
      ];

      if (decodedCursor.isPinned) {
        cursorConditions.unshift({ isPinned: false });
      }

      whereCondition.OR = cursorConditions;
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
          select: { id: true, name: true },
        },
        media: {
          select: { id: true, mediaUrl: true, mediaType: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
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

// POST /api/posts - สร้างโพสต์อวดสัตว์เลี้ยงพร้อมรูปภาพ
export async function POST(req: NextRequest) {
  try {
    // 1. ตรวจสอบ Session ผู้ใช้
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "กรุณาเข้าสู่ระบบก่อนทำการโพสต์",
        },
        { status: 401 }
      );
    }

    // 2. อ่านและ Parse Request Body เป็น JSON
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // 3. ตรวจสอบข้อมูลด้วย Zod
    const validation = createPostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { caption, description, category, media = [] } = validation.data;

     const prefix = `petmorchor/${user.id}/post/`;
      const ids = media.map((m) => m.publicId);
    if (
      !ids.every((id) => id.startsWith(prefix)) ||
      new Set(ids).size !== ids.length
    ) {
      return NextResponse.json(
        { success: false, message: "ไฟล์รูปภาพไม่ถูกต้อง" },
        { status: 400 }
      );
    }
  

    const cloud = process.env.CLOUDINARY_CLOUD_NAME;

    // 5. บันทึก Post พร้อมเชื่อม PostMedia แบบ Nested Write
    const newPost = await prisma.post.create({
      data: {
        caption,
        description,
        category,
        userId: user.id,
        ...(media.length > 0 && {
          media: {
             create: media.map((m, i) => ({
            mediaUrl: `https://res.cloudinary.com/${cloud}/image/upload/${m.publicId}`,
            mediaType: m.mediaType,
            publicId: m.publicId,
            width: m.width,
            height: m.height,
            order: i,
            })),
          },
        }),
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
        media: {
          orderBy: { id: "asc" },
        },
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, message: "ไฟล์รูปภาพนี้ถูกใช้งานไปแล้ว" },
        { status: 400 }
      );
    }

    console.error("POST /api/posts error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "ไม่สามารถสร้างโพสต์ได้",
      },
      { status: 500 }
    );
  }
}