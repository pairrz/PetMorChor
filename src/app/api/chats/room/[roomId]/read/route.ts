import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

// PUT /api/chats/rooms/[roomId]/read
export async function PUT(req: NextRequest, { params }: RouteParams) {
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

    // 1. ตรวจสอบว่าผู้ใช้อยู่ในห้องแชทนี้จริงหรือไม่
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        roomId,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, message: "Forbidden: คุณไม่ได้อยู่ในห้องแชทนี้" },
        { status: 403 }
      );
    }

    const messagesUpdate = await prisma.message.updateMany({
      where: {
        roomId,
        senderId: { not: user.id },
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          markedCount: messagesUpdate.count,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/chats/rooms/[roomId]/read error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}