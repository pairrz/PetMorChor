// app/api/admin/articles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createArticleSchema } from "@/lib/validations/admin";
import { requireAdmin } from "@/lib/auth-guard";

export async function GET() {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) return authCheck.response;

    const [articles, categories] = await Promise.all([
      prisma.article.findMany({
        orderBy: { createdAt: "desc" },
        include: { category: { select: { id: true, name: true } } },
      }),
      prisma.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    return NextResponse.json({ data: { articles, categories } });
  } catch (error) {
    console.error("List admin articles error:", error);
    return NextResponse.json(
      { message: "ไม่สามารถโหลดข้อมูลบทความได้" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
   const authCheck = await requireAdmin();
  if (!authCheck.authorized) {
    return authCheck.response;
  }
    // 2. Parse & Validate Request Body
    const body = await req.json();
    const parsed = createArticleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "ข้อมูลไม่ถูกต้อง",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { categoryId, title, content, speciesTag } = parsed.data;

    // 3. ตรวจสอบว่า Category มีอยู่จริงในระบบ
    const categoryExists = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!categoryExists) {
      return NextResponse.json(
        { message: "ไม่พบหมวดหมู่บทความที่ระบุ" },
        { status: 404 }
      );
    }

    // 4. บันทึกข้อมูลลงฐานข้อมูล
    const newArticle = await prisma.article.create({
      data: {
        categoryId,
        title,
        content,
        speciesTag,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(
      {
        message: "สร้างบทความสำเร็จ",
        data: newArticle,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Article Error:", error);
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}