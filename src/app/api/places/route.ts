import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation Schema สำหรับพิกัดและประเภทร้านค้า
const getPlacesQuerySchema = z.object({
  placeTypeId: z.coerce.number().int().positive().optional(),
  userLat: z.coerce.number().min(-90).max(90).optional(),
  userLng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(30).default(5), // รัศมีรอบ มช. ค่าเริ่มต้น 5 กม.
});

// กลไก In-memory Cache ตามบทเรียน Caching Solutions
let cachedPlaces: any[] | null = null;
let lastCacheFetch = 0;
const CACHE_TTL_MS = 1000 * 60 * 15; // แคชไว้ 15 นาที

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
    const now = Date.now();

    // 1. ตรวจสอบ Cache Hit / Miss[cite: 9]
    if (!cachedPlaces || now - lastCacheFetch > CACHE_TTL_MS) {
      cachedPlaces = await prisma.place.findMany({
        include: { placeType: true },
      });
      lastCacheFetch = now;
    }

    let results = [...cachedPlaces];

    // 2. กรองตามประเภทสถานที่ (เช่น คลินิก 24 ชม., ร้านอาหารสัตว์)
    if (placeTypeId) {
      results = results.filter((p) => p.placeTypeId === placeTypeId);
    }

    // 3. กรองตามระยะทางพิกัดรอบ มช. หาก Client มีการส่งตำแหน่งปัจจุบันเข้ามา
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
        cached: now - lastCacheFetch <= CACHE_TTL_MS,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/places error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}