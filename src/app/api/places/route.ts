import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getPlacesQuerySchema, isWithinRadiusKm } from "@/lib/places";

// กลไก In-memory Cache ตามบทเรียน Caching Solutions
type PlaceWithType = Prisma.PlaceGetPayload<{ include: { placeType: true } }>;

let cachedPlaces: PlaceWithType[] | null = null;
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
        return isWithinRadiusKm(
          Number(place.latitude),
          Number(place.longitude),
          userLat,
          userLng,
          radiusKm
        );
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