import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getArticlesQuerySchema } from "@/lib/validations/article";
import Prisma from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const parsedQuery = getArticlesQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return NextResponse.json(
        { success: false, errors: parsedQuery.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { page, limit, categoryId, speciesTag, search } = parsedQuery.data;
    const skip = (page - 1) * limit;

    // สร้างเงื่อนไข Dynamic Filter
    const where: Prisma.ArticleWhereInput = {
      ...(categoryId ? { categoryId } : {}),
      ...(speciesTag ? { speciesTag: { equals: speciesTag, mode: "insensitive" } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { content: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // Query ข้อมูลคู่กับนับ Total count แบบ Parallel
    const [articles, totalCount] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          content: true, // ดึงมาตัด excerpt ฝั่ง Server
          speciesTag: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.article.count({ where }),
    ]);

    // สร้าง Excerpt ย่อหน้าแรก 150 ตัวอักษร ไม่ส่ง content เต็มทั้งหมด
    const sanitizedArticles = articles.map((article) => ({
      id: article.id,
      title: article.title,
      speciesTag: article.speciesTag,
      category: article.category,
      createdAt: article.createdAt,
      excerpt:
        article.content.length > 150
          ? `${article.content.slice(0, 150)}...`
          : article.content,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json(
      {
        success: true,
        data: sanitizedArticles,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/articles error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการโหลดบทความ" },
      { status: 500 }
    );
  }
}