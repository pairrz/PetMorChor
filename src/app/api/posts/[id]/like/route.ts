import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "กรุณาเข้าสู่ระบบก่อนกดถูกใจ" },
        { status: 401 },
      );
    }

    const postId = Number((await params).id);
    if (!Number.isInteger(postId) || postId <= 0) {
      return NextResponse.json(
        { success: false, message: "ID โพสต์ไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const existingLike = await prisma.like.findUnique({
      where: { postId_userId: { postId, userId: user.id } },
    });

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
    } else {
      await prisma.like.create({ data: { postId, userId: user.id } });
    }

    const likes = await prisma.like.count({ where: { postId } });
    return NextResponse.json({
      success: true,
      liked: !existingLike,
      likes,
    });
  } catch (error) {
    console.error("POST /api/posts/[id]/like error:", error);
    return NextResponse.json(
      { success: false, message: "ไม่สามารถอัปเดตการถูกใจได้" },
      { status: 500 },
    );
  }
}
