import { z } from "zod";

// --- Listings Validation ---
export const getListingsQuerySchema = z.object({
  type: z.enum(["SALE", "ADOPTION"]).optional(),
  species: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "PENDING_PAYMENT", "SOLD", "HIDDEN"]).default("ACTIVE"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: z.coerce.number().int().positive().optional(),
});

export const createListingSchema = z.object({
  title: z.string().trim().min(3, "ชื่อประกาศต้องมีอย่างน้อย 3 ตัวอักษร").max(120),
  description: z.string().trim().min(10, "รายละเอียดต้องมีความยาวอย่างน้อย 10 ตัวอักษร"),
  species: z.string().trim().min(1, "กรุณาระบุสายพันธุ์/ประเภทสัตว์"),
  price: z.coerce.number().nonnegative("ราคาต้องไม่ติดลบ"),
  type: z.enum(["SALE", "ADOPTION"]),
  qrImageUrl: z.string().url("ลิงก์รูป QR Code ไม่ถูกต้อง").optional(),
  mediaUrls: z.array(z.string().url("ลิงก์รูปภาพไม่ถูกต้อง")).min(1, "ต้องมีรูปสัตว์เลี้ยงอย่างน้อย 1 รูป"),
});

// --- Orders Validation ---
export const createOrderSchema = z.object({
  listingId: z.coerce.number().int().positive(),
  guestEmail: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional(),
  guestPhone: z.string().min(9, "เบอร์โทรศัพท์ต้องมีอย่างน้อย 9 หลัก").max(15).optional(),
});

export const uploadSlipSchema = z.object({
  slipImageUrl: z.string().url("ลิงก์รูปสลิปไม่ถูกต้อง"),
});

// --- Comments Validation ---
export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "ข้อความต้องไม่ว่างเปล่า").max(500, "ความยาวไม่เกิน 500 ตัวอักษร"),
});

// --- Chat Messages Validation ---
export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "กรุณากรอกข้อความ").max(1000),
});

// --- Places Validation ---
export const getPlacesQuerySchema = z.object({
  placeTypeId: z.coerce.number().int().positive().optional(),
});