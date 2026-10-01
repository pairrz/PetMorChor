import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";
import { createCommentSchema } from "@/lib/validations/app";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const postId = Number((await params).id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json(
      { success: false, message: "ID โพสต์ไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  const comments = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ success: true, data: comments });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "กรุณาเข้าสู่ระบบก่อนคอมเมนต์" },
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

    const validation = createCommentSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const comment = await prisma.comment.create({
      data: { postId, userId: user.id, content: validation.data.content },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posts/[id]/comments error:", error);
    return NextResponse.json(
      { success: false, message: "ไม่สามารถเพิ่มคอมเมนต์ได้" },
      { status: 500 },
    );
  }
}
