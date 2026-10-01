import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const listingId = Number((await params).id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return NextResponse.json(
      { success: false, message: "ID ไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      user: { select: { id: true, name: true } },
      media: true,
    },
  });

  if (!listing) {
    return NextResponse.json(
      { success: false, message: "ไม่พบประกาศนี้" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: listing });
}
