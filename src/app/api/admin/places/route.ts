// app/api/admin/places/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPlaceSchema } from "@/lib/validations/admin";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAdmin();
  if (!authCheck.authorized) {
    return authCheck.response;
  }
    // 2. Parse & Validate Request Body
    const body = await req.json();
    const parsed = createPlaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "ข้อมูลไม่ถูกต้อง",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      placeTypeId,
      externalPlaceId,
      name,
      address,
      latitude,
      longitude,
      openingHours,
    } = parsed.data;

    // 3. ตรวจสอบว่า PlaceType มีอยู่จริงในระบบ
    const placeTypeExists = await prisma.placeType.findUnique({
      where: { id: placeTypeId },
    });

    if (!placeTypeExists) {
      return NextResponse.json(
        { message: "ไม่พบประเภทสถานที่ที่ระบุ" },
        { status: 404 }
      );
    }

    // 4. บันทึกข้อมูลสถานที่
    const newPlace = await prisma.place.create({
      data: {
        placeTypeId,
        externalPlaceId,
        name,
        address,
        // แปลงตัวเลขเป็น Prisma.Decimal สำหรับ Decimal(9,6)
        latitude: new Prisma.Decimal(latitude),
        longitude: new Prisma.Decimal(longitude),
        openingHours,
      },
      include: {
        placeType: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(
      {
        message: "เพิ่มสถานที่สำเร็จ",
        data: newPlace,
      },
      { status: 201 }
    );
  } catch (error) {
    // ดักจับ Unique Constraint ของ externalPlaceId
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "externalPlaceId นี้มีอยู่ในระบบแล้ว" },
        { status: 409 }
      );
    }

    console.error("Create Place Error:", error);
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}