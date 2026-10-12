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

    const { roomId } = await params;

    // 1. ตรวจสอบว่าผู้ใช้อยู่ในห้องแชทนี้จริงหรือไม่
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatRoomId: roomId,
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

    const now = new Date();

    // 2. อัปเดตสถานะอ่านแล้ว:
    // - มาร์กข้อความของอีกฝ่ายที่ยังไม่ได้อ่านให้เป็น isRead: true
    // - บันทึกเวลา lastReadAt ของตัวผู้ใช้เอง
    const [messagesUpdate, participantUpdate] = await prisma.$transaction([
      prisma.message.updateMany({
        where: {
          chatRoomId: roomId,
          senderId: { not: user.id }, // อัปเดตเฉพาะข้อความที่คนอื่นส่งมา
          isRead: false,
        },
        data: {
          isRead: true,
        },
      }),
      prisma.chatParticipant.update({
        where: {
          id: participant.id,
        },
        data: {
          lastReadAt: now,
          // หากใน schema มีฟิลด์ unreadCount สามารถ reset เป็น 0 ได้ด้วย:
          // unreadCount: 0,
        },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          markedCount: messagesUpdate.count,
          lastReadAt: now,
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