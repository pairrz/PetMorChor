// app/api/admin/articles/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { updateArticleSchema } from "@/lib/validations/admin";
import { requireAdmin } from "@/lib/auth-guard";

// ================= PATCH: แก้ไขบทความ =================
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
    const articleId = parseInt(id, 10);

    if (isNaN(articleId)) {
      return NextResponse.json({ message: "ID บทความไม่ถูกต้อง" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateArticleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "ข้อมูลไม่ถูกต้อง",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updateData = parsed.data;

    // หากมีการเปลี่ยน categoryId ให้ตรวจสอบความถูกต้องของหมวดหมู่ก่อน
    if (updateData.categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: updateData.categoryId },
      });
      if (!categoryExists) {
        return NextResponse.json({ message: "ไม่พบหมวดหมู่บทความที่ระบุ" }, { status: 404 });
      }
    }

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      message: "อัปเดตบทความสำเร็จ",
      data: updatedArticle,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "ไม่พบบทความที่ต้องการแก้ไข" }, { status: 404 });
    }

    console.error("Patch Article Error:", error);
    return NextResponse.json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" }, { status: 500 });
  }
}

// ================= DELETE: ลบบทความ =================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const { id } = await params;
    const articleId = parseInt(id, 10);

    if (isNaN(articleId)) {
      return NextResponse.json({ message: "ID บทความไม่ถูกต้อง" }, { status: 400 });
    }

    const deletedArticle = await prisma.article.delete({
      where: { id: articleId },
      select: { id: true, title: true },
    });

    return NextResponse.json({
      message: `ลบบทความ "${deletedArticle.title}" เรียบร้อยแล้ว`,
      data: deletedArticle,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "ไม่พบบทความที่ต้องการลบ" }, { status: 404 });
    }

    console.error("Delete Article Error:", error);
    return NextResponse.json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" }, { status: 500 });
  }
}