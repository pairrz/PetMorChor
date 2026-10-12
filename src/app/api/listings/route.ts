import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getListingsQuerySchema, createListingSchema } from "@/lib/validations/listing";
import { getSessionUser } from "@/lib/auth-guard";
import { Prisma } from "@/generated/prisma/client";

// GET /api/listings - ดึงรายการหาบ้าน/ซื้อขาย (Visitor ดูได้แบบ Read-only)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams.entries());

    const validation = getListingsQuerySchema.safeParse(query);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { type, species, status, limit, cursor } = validation.data;

    // Fast Feed Query พร้อม Cursor-based Pagination
    const listings = await prisma.listing.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      where: {
        status,
        type: type ? type : undefined,
        species: species ? { contains: species, mode: "insensitive" } : undefined,
      },
      orderBy: { createdAt: "desc" },
      include: {
        media: true,
        user: { select: { id: true, name: true } },
      },
    });

    let nextCursor: number | null = null;
    if (listings.length > limit) {
      const nextItem = listings.pop();
      nextCursor = nextItem ? nextItem.id : null;
    }

    return NextResponse.json(
      { success: true, data: listings, pagination: { nextCursor } },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/listings error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// POST /api/listings - ลงประกาศหาบ้าน/ขายสัตว์เลี้ยง (เฉพาะสมาชิกที่ล็อกอินแล้วเท่านั้น)
export async function POST(req: NextRequest) {
  try {
    // 1. ตรวจสอบสิทธิ์ (บล็อก Visitor)
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "กรุณาเข้าสู่ระบบก่อนลงประกาศ" },
        { status: 401 }
      );
    }

    // 2. Validate Request Body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const validation = createListingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, description, species, price, type, media } = validation.data;

    // 3. รูปต้องเป็นของผู้ใช้คนนี้ (purpose = listing) และห้ามซ้ำกัน
    const prefix = `petmorchor/${user.id}/listing/`;
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

    // 4. Nested Write บันทึก Listing พร้อม ListingMedia ใน Transaction เดียว
    const newListing = await prisma.listing.create({
      data: {
        userId: user.id,
        title,
        description,
        species,
        price,
        type,
        status: "AVAILABLE",
        media: {
          create: media.map((m, i) => ({
            // สร้าง URL ฝั่ง server เอง ไม่รับ URL จาก client
            mediaUrl: `https://res.cloudinary.com/${cloud}/image/upload/${m.publicId}`,
            publicId: m.publicId,
            width: m.width,
            height: m.height,
            order: i,
          })),
        },
      },
      include: {
        media: { orderBy: { id: "asc" } },
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: newListing }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"    
    ) {
      // publicId เคยถูกใช้ในประกาศอื่นแล้ว (unique)
      return NextResponse.json(
        { success: false, message: "ไฟล์รูปภาพไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    console.error("POST /api/listings error:", error);
    return NextResponse.json({ success: false, message: "สร้างประกาศไม่สำเร็จ" }, { status: 500 });
  }
}