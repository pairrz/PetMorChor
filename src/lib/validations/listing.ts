import { z } from "zod";

export const getListingsQuerySchema = z.object({
  type: z.enum(["SALE", "ADOPTION"]).optional(),
  species: z.string().trim().optional(),
  status: z.enum(["AVAILABLE", "ADOPTED", "HIDDEN"]).default("AVAILABLE"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: z.coerce.number().int().positive().optional(),
});

export const createListingSchema = z.object({
  title: z.string().trim().min(3, "ชื่อประกาศต้องมีอย่างน้อย 3 ตัวอักษร").max(100),
  description: z.string().trim().min(10, "รายละเอียดต้องมีความยาวอย่างน้อย 10 ตัวอักษร"),
  species: z.string().trim().min(1, "กรุณาระบุสายพันธุ์"),
  price: z.coerce.number().nonnegative("ราคาต้องไม่ติดลบ").default(0),
  type: z.enum(["SALE", "ADOPTION"]),
  mediaUrls: z.array(z.string().url()).default([]),
});

// Schema สำหรับเจ้าของโพสต์กดเปลี่ยนสถานะเป็น "มีคนรับเลี้ยงแล้ว"
export const updateListingStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "ADOPTED", "HIDDEN"]),
});