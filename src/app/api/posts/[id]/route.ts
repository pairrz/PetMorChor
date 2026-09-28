import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/posts/[id] - ดึงโพสต์รายตัวพร้อม Media และ Comments
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const postId = parseInt(id, 10);

  if (isNaN(postId)) {
    return NextResponse.json({ success: false, message: "ID ไม่ถูกต้อง" }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: { select: { id: true, name: true } },
      media: true,
      comments: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });

  if (!post) {
    return NextResponse.json({ success: false, message: "ไม่พบโพสต์ที่ต้องการ" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: post }, { status: 200 });
}

// DELETE /api/posts/[id] - ลบโพสต์ (เฉพาะเจ้าของหรือ Admin)[cite: 7, 9]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const postId = parseInt(id, 10);

    if (isNaN(postId)) {
      return NextResponse.json({ success: false, message: "ID ไม่ถูกต้อง" }, { status: 400 });
    }

    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!existingPost) {
      return NextResponse.json({ success: false, message: "ไม่พบโพสต์นี้ในระบบ" }, { status: 404 });
    }

    // Role-based Access Control + Resource Ownership Check[cite: 7, 9]
    const isOwner = existingPost.userId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "คุณไม่มีสิทธิ์ในการลบโพสต์นี้" },
        { status: 403 }
      );
    }

    // ทำการลบ Post (PostMedia, Like, Comment จะถูกลบอัตโนมัติตาม onDelete: Cascade ใน Schema)
    await prisma.post.delete({
      where: { id: postId },
    });

    return NextResponse.json(
      { success: true, message: "ลบโพสต์เรียบร้อยแล้ว" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/posts/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการลบโพสต์" },
      { status: 500 }
    );
  }
}