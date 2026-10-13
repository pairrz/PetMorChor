import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlacesQuerySchema } from "@/lib/validations/place";

// GET /api/places - ดึงพิกัดสถานที่รอบ มช. (Visitor เข้าถึงได้)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams.entries());

    const validation = getPlacesQuerySchema.safeParse(query);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { placeTypeId, userLat, userLng, radiusKm } = validation.data;
    let results = await prisma.place.findMany({
      include: { placeType: true },
    });

    if (placeTypeId) {
      results = results.filter((p) => p.placeTypeId === placeTypeId);
    }

    if (userLat !== undefined && userLng !== undefined) {
      results = results.filter((place) => {
        const pLat = Number(place.latitude);
        const pLng = Number(place.longitude);

        // คำนวณระยะทางแบบย่อ (Flat Earth approximation สำหรับระดับเมือง)
        const dLat = (pLat - userLat) * 111;
        const dLng = (pLng - userLng) * 111 * Math.cos(userLat * (Math.PI / 180));
        const distanceKm = Math.sqrt(dLat * dLat + dLng * dLng);

        return distanceKm <= radiusKm;
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/places error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}