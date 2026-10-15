import { z } from "zod";

export const getPlacesQuerySchema = z.object({
  placeTypeId: z.coerce.number().int().positive().optional(),
  userLat: z.coerce.number().min(-90).max(90).optional(),
  userLng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(30).default(5),
});

export function isWithinRadiusKm(
  placeLat: number,
  placeLng: number,
  userLat: number,
  userLng: number,
  radiusKm: number
): boolean {
  const dLat = (placeLat - userLat) * 111;
  const dLng =
    (placeLng - userLng) * 111 * Math.cos(userLat * (Math.PI / 180));
  const distanceKm = Math.sqrt(dLat * dLat + dLng * dLng);

  return distanceKm <= radiusKm;
}
