import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";
import { z } from "zod";

const querySchema = z.object({
  cursor: z.string().optional(), // id ของข้อความสุดท้ายที่ฝั่ง client มีอยู่
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

// GET /api/chats/rooms/[roomId]/messages?limit=30&cursor=cm...
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { roomId } = await params;

    // 1. ตรวจสอบสิทธิ์ว่า user นี้เป็น participant ของห้องนี้จริงหรือไม่
    const isMember = await prisma.chatParticipant.findFirst({
      where: {
        chatRoomId: roomId,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!isMember) {
      return NextResponse.json(
        { success: false, message: "Forbidden: คุณไม่มีสิทธิ์เข้าถึงห้องแชทนี้" },
        { status: 403 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(req.url);
    const queryValidation = querySchema.safeParse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        { success: false, errors: queryValidation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { cursor, limit } = queryValidation.data;

    // 3. ดึงข้อความย้อนหลังจากใหม่ไปเก่า (desc)
    const messages = await prisma.message.findMany({
      where: {
        chatRoomId: roomId,
      },
      take: limit + 1, // ดึงเกิน 1 ข้อความเพื่อเช็คว่ามีหน้าถัดไป (hasMore) หรือไม่
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // ข้าม id ตัวที่เป็น cursor
      }),
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // 4. ตรวจสอบ hasMore และหา nextCursor
    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop(); // ตัดไอเทมที่เกินออกมา
    }

    const nextCursor = hasMore ? messages[messages.length - 1]?.id : null;

    // 5. สลับลำดับกลับเป็นเก่าไปใหม่ (asc) เพื่อให้ Client render จากบนลงล่างได้ทันที
    const chronologicalMessages = [...messages].reverse();

    return NextResponse.json(
      {
        success: true,
        data: chronologicalMessages,
        pagination: {
          hasMore,
          nextCursor,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/chats/rooms/[roomId]/messages error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}