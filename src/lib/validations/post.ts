import { z } from "zod";

// ตรวจสอบ Query parameters สำหรับ GET /api/posts
export const getPostsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1, "ต้องดึงอย่างน้อย 1 รายการ")
    .max(50, "ดึงได้สูงสุดไม่เกิน 50 รายการต่อครั้ง")
    .default(10),
  cursor: z.string().min(1).optional(),
  category: z.enum(["GENERAL", "LOST_PET", "ADOPTION"]).optional(),
});

// ตรวจสอบ Metadata ของรูปภาพที่อัปโหลดขึ้น Cloudinary สำเร็จแล้ว
export const postMediaSchema = z.object({
  publicId: z.string().min(1, "ต้องระบุ publicId ของรูปภาพ"),
  mediaType: z.string().default("IMAGE"),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

// ตรวจสอบ Request Body สำหรับสร้างโพสต์ใหม่ POST /api/posts
export const createPostSchema = z.object({
  caption: z
    .string()
    .trim()
    .min(1, "กรุณากรอกแคปชัน")
    .max(255, "แคปชันต้องไม่เกิน 255 ตัวอักษร"),
  description: z
    .string()
    .trim()
    .min(5, "รายละเอียดต้องมีความยาวอย่างน้อย 5 ตัวอักษร")
    .max(2000, "รายละเอียดต้องยาวไม่เกิน 2,000 ตัวอักษร"),
  category: z.enum(["GENERAL", "LOST_PET", "ADOPTION"]).default("GENERAL"),
  media: z
    .array(postMediaSchema)
    .max(10, "อัปโหลดรูปภาพหรือวิดีโอได้สูงสุด 10 ไฟล์")
    .default([]),
});

export type GetPostsQueryInput = z.infer<typeof getPostsQuerySchema>;
export type PostMediaInput = z.infer<typeof postMediaSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;