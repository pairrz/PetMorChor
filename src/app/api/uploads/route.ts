import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-guard";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปภาพ" },
        { status: 401 },
      );
    }

    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, message: "กรุณาเลือกรูปภาพ" },
        { status: 400 },
      );
    }

    if (files.length > 5) {
      return NextResponse.json(
        { success: false, message: "อัปโหลดได้ไม่เกิน 5 รูป" },
        { status: 400 },
      );
    }

    const uploadDirectory = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDirectory, { recursive: true });

    const urls: string[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/") || file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, message: "รองรับเฉพาะรูปภาพขนาดไม่เกิน 5 MB ต่อไฟล์" },
          { status: 400 },
        );
      }

      const extension = path.extname(file.name).toLowerCase() || ".jpg" || ".jpeg" || ".png";
      const filename = `${randomUUID()}${extension}`;
      await writeFile(
        path.join(uploadDirectory, filename),
        Buffer.from(await file.arrayBuffer()),
      );
      urls.push(`/uploads/${filename}`);
    }

    return NextResponse.json({ success: true, urls }, { status: 201 });
  } catch (error) {
    console.error("POST /api/uploads error:", error);
    return NextResponse.json(
      { success: false, message: "อัปโหลดรูปภาพไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
