import { z } from "zod";

const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export const mediaItemSchema = z.object({
  url: z.string().url().startsWith(`https://res.cloudinary.com/${cloud}/`),
  publicId: z.string().min(1),
  type: z.enum(["IMAGE", "VIDEO"]),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const mediaListSchema = z.array(mediaItemSchema).max(5);