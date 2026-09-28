import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "ข้อความต้องไม่ว่างเปล่า").max(1000),
});

// GET /api/chats/rooms/[roomId]/messages - ดึงประวัติข้อความในห้องแชท
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { roomId: rawRoomId } = await params;
    const roomId = parseInt(rawRoomId, 10);
    if (isNaN(roomId)) {
      return NextResponse.json({ success: false, message: "Invalid Room ID" }, { status: 400 });
    }

    // ตรวจสอบสิทธิ์ว่าผู้ใช้เป็นสมาชิกของห้องแชทนี้จริงหรือไม่[cite: 7, 9]
    const isMember = await prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });

    if (!isMember) {
      return NextResponse.json(
        { success: false, message: "คุณไม่มีสิทธิ์เข้าถึงห้องสนทนานี้" },
        { status: 403 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: messages }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// POST /api/chats/rooms/[roomId]/messages - ส่งข้อความใหม่ในห้องแชท
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { roomId: rawRoomId } = await params;
    const roomId = parseInt(rawRoomId, 10);
    if (isNaN(roomId)) {
      return NextResponse.json({ success: false, message: "Invalid Room ID" }, { status: 400 });
    }

    // 1. Data Validation[cite: 1]
    const body = await req.json();
    const validation = sendMessageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบสิทธิ์ห้องสนทนา[cite: 7, 9]
    const isMember = await prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });

    if (!isMember) {
      return NextResponse.json(
        { success: false, message: "คุณไม่มีสิทธิ์ส่งข้อความในห้องนี้" },
        { status: 403 }
      );
    }

    // 3. บันทึกข้อความ และอัปเดต updatedAt ของห้องแชทผ่าน Transaction[cite: 9]
    const message = await prisma.$transaction(async (tx) => {
      const newMsg = await tx.message.create({
        data: {
          roomId,
          senderId: user.id,
          content: validation.data.content,
        },
        include: {
          sender: { select: { id: true, name: true } },
        },
      });

      await tx.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });

      return newMsg;
    });

    // (หมายเหตุ: จุดนี้สามารถส่งสัญญาณ Real-time ต่อไปยัง Socket.io Server หรือ Broadcast ผ่าน Redis ได้)[cite: 8, 9]

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    console.error("POST message error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}