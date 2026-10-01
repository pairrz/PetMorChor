import { z } from "zod";

// Validation Schema สำหรับพิกัดและประเภทร้านค้า
export const getPlacesQuerySchema = z.object({
  placeTypeId: z.coerce.number().int().positive().optional(),
  userLat: z.coerce.number().min(-90).max(90).optional(),
  userLng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(30).default(5), // รัศมีรอบ มช. ค่าเริ่มต้น 5 กม.
});