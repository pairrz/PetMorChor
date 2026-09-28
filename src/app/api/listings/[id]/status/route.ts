import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";
import { updateListingStatusSchema } from "@/lib/validations/listing";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/listings/[id]/status - อัปเดตสถานะประกาศ
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const listingId = parseInt(id, 10);
    if (isNaN(listingId)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const validation = updateListingStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าประกาศมีอยู่จริงและผู้ใช้เป็นเจ้าของประกาศหรือไม่[cite: 7, 9]
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { userId: true },
    });

    if (!listing) {
      return NextResponse.json({ success: false, message: "ไม่พบประกาศนี้" }, { status: 404 });
    }

    const isOwner = listing.userId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "คุณไม่มีสิทธิ์แก้ไขสถานะของประกาศนี้" },
        { status: 403 }
      );
    }

    // อัปเดตสถานะ เช่น เปลี่ยนเป็น ADOPTED
    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: { status: validation.data.status },
    });

    return NextResponse.json({
      success: true,
      message: "อัปเดตสถานะประกาศสำเร็จ",
      data: updatedListing,
    });
  } catch (error) {
    console.error("PATCH /api/listings/[id]/status error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// GET /api/listings/[id] - ดูรายละเอียดสัตว์เลี้ยงรายตัว (Public Read-only)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const listingId = parseInt(id, 10);

  if (isNaN(listingId)) {
    return NextResponse.json({ success: false, message: "ID ไม่ถูกต้อง" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      user: { select: { id: true, name: true } },
      media: true,
    },
  });

  if (!listing) {
    return NextResponse.json({ success: false, message: "ไม่พบประกาศนี้" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: listing }, { status: 200 });
}

// DELETE /api/listings/[id] - ลบประกาศ (เฉพาะเจ้าของประกาศ หรือ Admin เท่านั้น)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const listingId = parseInt(id, 10);
    if (isNaN(listingId)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const existingListing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { userId: true },
    });

    if (!existingListing) {
      return NextResponse.json({ success: false, message: "ไม่พบประกาศนี้" }, { status: 404 });
    }

    // Role-based Access Control + Ownership Check[cite: 7, 9]
    const isOwner = existingListing.userId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "คุณไม่มีสิทธิ์ในการลบประกาศนี้" },
        { status: 403 }
      );
    }

    await prisma.listing.delete({ where: { id: listingId } });

    return NextResponse.json({ success: true, message: "ลบประกาศเรียบร้อยแล้ว" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}