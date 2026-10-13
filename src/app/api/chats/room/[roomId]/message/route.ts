import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";
import { z } from "zod";

const querySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { roomId: roomIdParam } = await params;
    const roomId = Number(roomIdParam);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid Room ID" },
        { status: 400 },
      );
    }

    // 1. ตรวจสอบสิทธิ์ว่า user นี้เป็น participant ของห้องนี้จริงหรือไม่
    const isMember = await prisma.chatParticipant.findFirst({
      where: {
        roomId,
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

    const messages = await prisma.message.findMany({
      where: {
        roomId,
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor }, //  cursor เป็น number (Int) เรียบร้อยแล้ว
        skip: 1,
      }),
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
        attachments: {
          select: {
            id: true,
            mediaUrl: true,
            publicId: true,
            width: true,
            height: true,
          },
        },
      },
    });

    // 4. ตรวจสอบ hasMore และหา nextCursor
    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop();
    }

    const nextCursor = hasMore ? messages[messages.length - 1]?.id : null;

    // 5. สลับลำดับกลับเป็นเก่าไปใหม่ (asc) เพื่อ render แชตจากบนลงล่าง
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
    console.error("GET messages error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}