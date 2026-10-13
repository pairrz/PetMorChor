
import { z } from "zod";

// --- Article Schemas ---
export const createArticleSchema = z.object({
  categoryId: z.number({ message: "กรุณาระบุหมวดหมู่" }).int().positive(),
  title: z.string().min(3, "หัวข้อต้องมีความยาวอย่างน้อย 3 ตัวอักษร").max(200),
  content: z.string().min(10, "เนื้อหาต้องมีความยาวอย่างน้อย 10 ตัวอักษร"),
  speciesTag: z.string().min(1, "กรุณาระบุแท็กสายพันธุ์"),
});

export const updateArticleSchema = createArticleSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "ต้องระบุฟิลด์ที่ต้องการแก้ไขอย่างน้อย 1 ฟิลด์",
  });

// --- Place Schemas ---
export const createPlaceSchema = z.object({
  placeTypeId: z.number({ message: "กรุณาระบุประเภทสถานที่" }).int().positive(),
  externalPlaceId: z.string().min(1, "กรุณาระบุ externalPlaceId"),
  name: z.string().min(2, "ชื่อสถานที่ต้องมีความยาวอย่างน้อย 2 ตัวอักษร"),
  address: z.string().min(5, "ที่อยู่ต้องมีความยาวอย่างน้อย 5 ตัวอักษร"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  openingHours: z.string().min(1, "กรุณาระบุเวลาทำการ"),
});

export const updatePlaceSchema = createPlaceSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "ต้องระบุฟิลด์ที่ต้องการแก้ไขอย่างน้อย 1 ฟิลด์",
  });