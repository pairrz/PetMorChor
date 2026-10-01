import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getArticlesQuerySchema } from "@/lib/validations/article";
import  Prisma  from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    // 1. ดึง Search Params ผ่าน req.nextUrl โดยตรง
    const queryParams = Object.fromEntries(req.nextUrl.searchParams.entries());

    const parsedQuery = getArticlesQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return NextResponse.json(
        { success: false, errors: parsedQuery.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { page, limit, categoryId, speciesTag, search } = parsedQuery.data;
    const skip = (page - 1) * limit;

    // ✅ ใช้ Parameters ดึง type ออกมาจากฟังก์ชัน findMany ของ prisma.article โดยตรง
    type ArticleWhere = NonNullable<Parameters<typeof prisma.article.findMany>[0]>["where"];

    // 2. สร้างเงื่อนไข Dynamic Filter
    const where: ArticleWhere = {
      ...(categoryId ? { categoryId } : {}),
      // ปรับเป็น contains เพื่อรองรับ speciesTag ที่เก็บแบบ comma-separated เช่น "สุนัข, แมว"
      ...(speciesTag
        ? { speciesTag: { contains: speciesTag, mode: "insensitive" } }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { content: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // 3. Query ข้อมูลคู่กับนับ Total count แบบ Parallel
    const [articles, totalCount] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          content: true,
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

    // 4. ตัด Excerpt และเก็บเฉพาะเนื้อหาที่จำเป็น
    const sanitizedArticles = articles.map((article) => {
      // ตัด newline ทิ้งก่อนทำ excerpt เพื่อไม่ให้ preview ย่นหรือแหว่ง
      const plainContent = article.content.replace(/\s+/g, " ").trim();
      return {
        id: article.id,
        title: article.title,
        speciesTag: article.speciesTag,
        category: article.category,
        createdAt: article.createdAt,
        excerpt:
          plainContent.length > 150
            ? `${plainContent.slice(0, 150)}...`
            : plainContent,
      };
    });

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