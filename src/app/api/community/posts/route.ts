import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const maxImageCount = 10;
const maxImageSize = 5 * 1024 * 1024;

const postFieldsSchema = z.object({
  caption: z.string().trim().min(1, "กรุณากรอกหัวข้อ").max(255),
  description: z
    .string()
    .trim()
    .min(5, "รายละเอียดต้องมีความยาวอย่างน้อย 5 ตัวอักษร")
    .max(2000, "รายละเอียดต้องยาวไม่เกิน 2,000 ตัวอักษร"),
  category: z.enum(["GENERAL", "LOST_PET", "ADOPTION"]),
});

const imageTypes = {
  "image/jpeg": {
    extension: "jpg",
    matches: (bytes: Buffer) =>
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff,
  },
  "image/png": {
    extension: "png",
    matches: (bytes: Buffer) =>
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  "image/gif": {
    extension: "gif",
    matches: (bytes: Buffer) =>
      bytes.subarray(0, 6).toString("ascii") === "GIF87a" ||
      bytes.subarray(0, 6).toString("ascii") === "GIF89a",
  },
  "image/webp": {
    extension: "webp",
    matches: (bytes: Buffer) =>
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP",
  },
} as const;

function isSupportedImageType(
  contentType: string,
): contentType is keyof typeof imageTypes {
  return Object.hasOwn(imageTypes, contentType);
}

export async function POST(req: NextRequest) {
  const savedFilePaths: string[] = [];

  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนทำการโพสต์" },
        { status: 401 },
      );
    }

    const formData = await req.formData();
    const fields = postFieldsSchema.safeParse({
      caption: formData.get("caption"),
      description: formData.get("description"),
      category: formData.get("category"),
    });

    if (!fields.success) {
      return NextResponse.json(
        { error: fields.error.issues[0]?.message ?? "ข้อมูลโพสต์ไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const imageEntries = formData.getAll("images");
    const images = imageEntries.filter(
      (entry): entry is File => entry instanceof File,
    );
    if (images.length !== imageEntries.length) {
      return NextResponse.json(
        { error: "ไฟล์รูปภาพไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    if (images.length > maxImageCount) {
      return NextResponse.json(
        { error: `แนบรูปภาพได้สูงสุด ${maxImageCount} รูป` },
        { status: 400 },
      );
    }

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "community",
    );
    const uploadedMedia: { mediaUrl: string; mediaType: string }[] = [];
    const validatedImages: {
      bytes: Buffer;
      extension: (typeof imageTypes)[keyof typeof imageTypes]["extension"];
    }[] = [];

    for (const image of images) {
      if (image.size === 0 || image.size > maxImageSize) {
        return NextResponse.json(
          { error: "รูปภาพต้องมีขนาดไม่เกิน 5 MB ต่อรูป" },
          { status: 400 },
        );
      }

      if (!isSupportedImageType(image.type)) {
        return NextResponse.json(
          { error: "รองรับเฉพาะไฟล์ JPG, PNG, GIF และ WebP" },
          { status: 400 },
        );
      }

      const imageType = imageTypes[image.type];
      const bytes = Buffer.from(await image.arrayBuffer());
      if (!imageType.matches(bytes)) {
        return NextResponse.json(
          { error: "ชนิดไฟล์ไม่ตรงกับข้อมูลรูปภาพ" },
          { status: 400 },
        );
      }

      validatedImages.push({ bytes, extension: imageType.extension });
    }

    await mkdir(uploadDirectory, { recursive: true });
    for (const image of validatedImages) {
      const fileName = `${randomUUID()}.${image.extension}`;
      const filePath = path.join(uploadDirectory, fileName);
      await writeFile(filePath, image.bytes, { flag: "wx" });
      savedFilePaths.push(filePath);
      uploadedMedia.push({
        mediaUrl: `/uploads/community/${fileName}`,
        mediaType: "IMAGE",
      });
    }

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        caption: fields.data.caption,
        description: fields.data.description,
        category: fields.data.category,
        media: { create: uploadedMedia },
      },
    });

    return NextResponse.json(
      { success: true, message: "สร้างโพสต์สำเร็จ", data: post },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/community/posts error:", error);
    const cleanupResults = await Promise.allSettled(
      savedFilePaths.map((filePath) => unlink(filePath)),
    );
    for (const result of cleanupResults) {
      if (result.status === "rejected") {
        console.error(
          "Failed to remove an uploaded community image:",
          result.reason,
        );
      }
    }

    return NextResponse.json(
      { error: "ไม่สามารถสร้างโพสต์ได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 },
    );
  }
}
