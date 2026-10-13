// app/api/admin/places/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createPlaceSchema } from "@/lib/validations/admin";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth-guard";

const defaultPlaceTypes = [
  "คลินิก / โรงพยาบาลสัตว์",
  "ร้านอาหาร / อุปกรณ์สัตว์เลี้ยง",
  "ร้านอาบน้ำ / ตัดขน",
  "สวนสำหรับสุนัข",
];

export async function GET() {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const placeTypes = await prisma.placeType.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    const existingNames = new Set(placeTypes.map((placeType) => placeType.name));

    return NextResponse.json({
      success: true,
      data: [
        ...placeTypes,
        ...defaultPlaceTypes
          .filter((name) => !existingNames.has(name))
          .map((name) => ({ name })),
      ],
    });
  } catch (error) {
    console.error("Get Place Types Error:", error);
    return NextResponse.json(
      { message: "โหลดประเภทสถานที่ไม่สำเร็จ" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) {
      return authCheck.response;
    }

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
      placeTypeName,
      externalPlaceId,
      name,
      address,
      latitude,
      longitude,
      openingHours,
    } = parsed.data;

    const newPlace = await prisma.$transaction(async (transaction) => {
      const placeType = placeTypeId
        ? await transaction.placeType.findUnique({ where: { id: placeTypeId } })
        : placeTypeName
          ? await transaction.placeType.upsert({
              where: { name: placeTypeName },
              update: {},
              create: { name: placeTypeName },
            })
          : null;

      if (!placeType) return null;

      return transaction.place.create({
        data: {
          placeTypeId: placeType.id,
          externalPlaceId: externalPlaceId ?? `manual-${randomUUID()}`,
          name,
          address,
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
    });

    if (!newPlace) {
      return NextResponse.json(
        { message: "ไม่พบประเภทสถานที่ที่ระบุ" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        message: "เพิ่มสถานที่สำเร็จ",
        data: newPlace,
      },
      { status: 201 }
    );
  } catch (error) {
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