import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";
import { z } from "zod";

const createRoomSchema = z.object({
  listingId: z.coerce.number().int().positive("รหัสประกาศไม่ถูกต้อง").optional(),
  userId: z.coerce.number().int().positive("รหัสผู้ใช้ไม่ถูกต้อง").optional(),
}).refine((value) => value.listingId !== undefined || value.userId !== undefined, {
  message: "ต้องระบุประกาศหรือผู้ใช้ปลายทาง",
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
          orderBy: { createdAt: "desc" }, // แสดงข้อความล่าสุดใน Inbox
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: user.id },
                isRead: false,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: rooms }, { status: 200 });
  } catch (error) {
    console.error("GET /api/chats/rooms error:", error);
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

    const { listingId, userId: targetUserId } = validation.data;

    if (targetUserId !== undefined) {
      if (targetUserId === user.id) {
        return NextResponse.json(
          { success: false, message: "ไม่สามารถสร้างห้องแชทกับตัวเองได้" },
          { status: 400 },
        );
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });
      if (!targetUser) {
        return NextResponse.json(
          { success: false, message: "ไม่พบผู้ใช้นี้" },
          { status: 404 },
        );
      }

      const existingRoom = await prisma.chatRoom.findFirst({
        where: {
          listingId: null,
          participants: {
            every: { userId: { in: [user.id, targetUserId] } },
            none: { userId: { notIn: [user.id, targetUserId] } },
          },
          AND: [
            { participants: { some: { userId: user.id } } },
            { participants: { some: { userId: targetUserId } } },
          ],
        },
        include: {
          listing: { select: { id: true, title: true, status: true, media: { take: 1 } } },
          participants: { include: { user: { select: { id: true, name: true } } } },
        },
      });

      const room = existingRoom
        ? await prisma.chatRoom.update({
            where: { id: existingRoom.id },
            data: { updatedAt: new Date() },
            include: {
              listing: { select: { id: true, title: true, status: true, media: { take: 1 } } },
              participants: { include: { user: { select: { id: true, name: true } } } },
            },
          })
        : await prisma.chatRoom.create({
            data: {
              listingId: null,
              participants: {
                create: [{ userId: user.id }, { userId: targetUserId }],
              },
            },
            include: {
              listing: { select: { id: true, title: true, status: true, media: { take: 1 } } },
              participants: { include: { user: { select: { id: true, name: true } } } },
            },
          });

      return NextResponse.json({ success: true, data: room }, { status: 200 });
    }

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
        listing: {
          select: { id: true, title: true, status: true, media: { take: 1 } },
        },
        participants: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (room) {
      // [จุดที่ปรับ]: มีห้องเดิมอยู่แล้ว ให้อัปเดต updatedAt เพื่อดันห้องขึ้นบนสุดของ Inbox
      room = await prisma.chatRoom.update({
        where: { id: room.id },
        data: { updatedAt: new Date() },
        include: {
          listing: {
            select: { id: true, title: true, status: true, media: { take: 1 } },
          },
          participants: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });
    } else {
      // หากยังไม่เคยมี ให้สร้างห้องใหม่
      room = await prisma.chatRoom.create({
        data: {
          listingId: listing.id,
          participants: {
            create: [
              { userId: user.id },        // ผู้ซื้อ / ผู้สนใจ
              { userId: listing.userId }, // เจ้าของประกาศ
            ],
          },
        },
        include: {
          listing: {
            select: { id: true, title: true, status: true, media: { take: 1 } },
          },
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