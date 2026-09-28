import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";
import { z } from "zod";

const createRoomSchema = z.object({
  listingId: z.coerce.number().int().positive("รหัสประกาศไม่ถูกต้อง"),
});

// GET /api/chats/rooms - ดึงรายการห้องแชททั้งหมดของผู้ใช้ที่ล็อกอินอยู่
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const rooms = await prisma.chatRoom.findMany({
      where: {
        participants: { some: { userId: user.id } },
      },
      include: {
        listing: {
          select: { id: true, title: true, status: true, media: { take: 1 } },
        },
        participants: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" }, // แสดงข้อความล่าสุดในกล่อง Inbox
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: rooms }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// POST /api/chats/rooms - กด "ทักแชทคนขาย" จากหน้าประกาศ (สร้างหรือดึงห้องเดิม)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createRoomSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { listingId } = validation.data;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, userId: true, title: true },
    });

    if (!listing) {
      return NextResponse.json({ success: false, message: "ไม่พบประกาศนี้" }, { status: 404 });
    }

    // ป้องกันไม่ให้แชทหาตัวเอง
    if (listing.userId === user.id) {
      return NextResponse.json(
        { success: false, message: "ไม่สามารถสร้างห้องแชทกับตัวเองได้" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าเคยมีห้องคุยกันสำหรับประกาศนี้แล้วหรือไม่
    let room = await prisma.chatRoom.findFirst({
      where: {
        listingId: listing.id,
        AND: [
          { participants: { some: { userId: user.id } } },
          { participants: { some: { userId: listing.userId } } },
        ],
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    // หากยังไม่เคยมี ให้สร้างห้องใหม่พร้อมใส่ผู้ซื้อและผู้ขายเข้าเป็น Participant
    if (!room) {
      room = await prisma.chatRoom.create({
        data: {
          listingId: listing.id,
          participants: {
            create: [
              { userId: user.id },          // ผู้สนใจ/ผู้รับเลี้ยง
              { userId: listing.userId },   // เจ้าของสัตว์เลี้ยง
            ],
          },
        },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });
    }

    return NextResponse.json({ success: true, data: room }, { status: 200 });
  } catch (error) {
    console.error("POST /api/chats/rooms error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}