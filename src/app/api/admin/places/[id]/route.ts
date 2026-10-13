// app/api/admin/places/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { updatePlaceSchema } from "@/lib/validations/admin";
import { requireAdmin } from "@/lib/auth-guard";

// ================= PATCH: แก้ไขสถานที่ =================
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAdmin();
  if (!authCheck.authorized) {
    return authCheck.response;
  }

    const { id } = await params;
    const placeId = parseInt(id, 10);

    if (isNaN(placeId)) {
      return NextResponse.json({ message: "ID สถานที่ไม่ถูกต้อง" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updatePlaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "ข้อมูลไม่ถูกต้อง",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { latitude, longitude, placeTypeId, ...otherFields } = parsed.data;

    // ตรวจสอบ placeTypeId หากมีการส่งมาเปลี่ยน
    if (placeTypeId) {
      const typeExists = await prisma.placeType.findUnique({
        where: { id: placeTypeId },
      });
      if (!typeExists) {
        return NextResponse.json({ message: "ไม่พบประเภทสถานที่ที่ระบุ" }, { status: 404 });
      }
    }

    // เตรียม Payload สำหรับ Prisma Update
    const updatePayload: Prisma.PlaceUpdateInput = {
      ...otherFields,
      ...(placeTypeId && {
        placeType: { connect: { id: placeTypeId } },
      }),
      ...(latitude !== undefined && {
        latitude: new Prisma.Decimal(latitude),
      }),
      ...(longitude !== undefined && {
        longitude: new Prisma.Decimal(longitude),
      }),
    };

    const updatedPlace = await prisma.place.update({
      where: { id: placeId },
      data: updatePayload,
      include: {
        placeType: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      message: "อัปเดตสถานที่สำเร็จ",
      data: updatedPlace,
    });
  } catch (error) {
    // P2025: ไม่พบ record
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "ไม่พบสถานที่ที่ต้องการแก้ไข" }, { status: 404 });
    }

    // P2002: externalPlaceId ซ้ำกับรายการอื่น
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "externalPlaceId นี้ถูกใช้งานแล้ว" },
        { status: 409 }
      );
    }

    console.error("Patch Place Error:", error);
    return NextResponse.json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" }, { status: 500 });
  }
}

// ================= DELETE: ลบสถานที่ =================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const placeId = parseInt(id, 10);

    if (isNaN(placeId)) {
      return NextResponse.json({ message: "ID สถานที่ไม่ถูกต้อง" }, { status: 400 });
    }

    const deletedPlace = await prisma.place.delete({
      where: { id: placeId },
      select: {
        id: true,
        name: true,
        externalPlaceId: true,
      },
    });

    return NextResponse.json({
      message: `ลบสถานที่ "${deletedPlace.name}" เรียบร้อยแล้ว`,
      data: deletedPlace,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "ไม่พบสถานที่ที่ต้องการลบ" }, { status: 404 });
    }

    console.error("Delete Place Error:", error);
    return NextResponse.json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" }, { status: 500 });
  }
}