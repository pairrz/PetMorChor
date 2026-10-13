import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";

// GET /api/chats/unread-count - ดึงจำนวนข้อความที่ยังไม่ได้อ่านรวมทั้งหมดของผู้ใช้
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // วิธีที่ 1 (แม่นยำที่สุด): นับ Message ที่อยู่ในห้องของผู้ใช้ โดยที่ผู้ใช้ไม่ได้เป็นคนส่ง และยังไม่ได้เปิดอ่าน
    const totalUnread = await prisma.message.count({
      where: {
        room: {
          participants: {
            some: {
              userId: user.id,
            },
          },
        },
        senderId: { not: user.id }, // นับเฉพาะข้อความที่คนอื่นส่งมา
        isRead: false,
      },
    });

    /* 
    // ทางเลือก วิธีที่ 2 (กรณีเก็บ unreadCount สะสมไว้ที่ ChatParticipant):
    const aggregate = await prisma.chatParticipant.aggregate({
      where: { userId: user.id },
      _sum: { unreadCount: true },
    });
    const totalUnread = aggregate._sum.unreadCount ?? 0;
    */

    return NextResponse.json(
      {
        success: true,
        data: {
          unreadCount: totalUnread,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/chats/unread-count error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}