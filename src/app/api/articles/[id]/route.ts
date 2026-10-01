import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const articleId = Number.parseInt(id, 10);

    if (Number.isNaN(articleId) || articleId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid article ID" },
        { status: 400 }
      );
    }

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, message: "ไม่พบบทความที่ต้องการ" },
        { status: 404 }
      );
    }

    // ดึงบทความแนะนำที่เกี่ยวข้อง 3 บทความ
    const relatedArticles = await prisma.article.findMany({
      where: {
        id: { not: article.id },
        OR: [
          { categoryId: article.categoryId },
          { speciesTag: article.speciesTag },
        ],
      },
      take: 3,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        speciesTag: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...article,
          relatedArticles,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/articles/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการโหลดรายละเอียดบทความ" },
      { status: 500 }
    );
  }
}