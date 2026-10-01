import { z } from "zod";

export const getArticlesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  categoryId: z.coerce.number().int().positive().optional(),
  speciesTag: z.string().trim().min(1).optional(),
  search: z.string().trim().optional(),
});

export type GetArticlesQuery = z.infer<typeof getArticlesQuerySchema>;