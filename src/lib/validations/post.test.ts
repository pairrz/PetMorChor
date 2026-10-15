import { describe, expect, it } from "vitest";
import { createPostSchema, getPostsQuerySchema } from "./post";

describe("getPostsQuerySchema", () => {
  it("uses the default page size and coerces a cursor", () => {
    expect(getPostsQuerySchema.parse({ cursor: "8" })).toEqual({
      limit: 10,
      cursor: 8,
    });
  });

  it("rejects a cursor that is not a positive integer", () => {
    expect(getPostsQuerySchema.safeParse({ cursor: "0" }).success).toBe(false);
    expect(getPostsQuerySchema.safeParse({ cursor: "1.5" }).success).toBe(false);
  });
});

describe("createPostSchema", () => {
  it("trims text and defaults media to an empty array", () => {
    expect(
      createPostSchema.parse({
        caption: "  เจอน้องแมว  ",
        description: "พบแมวอยู่ใกล้ประตูมหาวิทยาลัย",
      })
    ).toEqual({
      caption: "เจอน้องแมว",
      description: "พบแมวอยู่ใกล้ประตูมหาวิทยาลัย",
      media: [],
    });
  });

  it("rejects invalid media URLs and more than ten files", () => {
    expect(
      createPostSchema.safeParse({
        caption: "ช่วยตามหา",
        description: "พบแมวอยู่ใกล้ประตูมหาวิทยาลัย",
        media: [{ mediaUrl: "invalid", mediaType: "IMAGE" }],
      }).success
    ).toBe(false);
    expect(
      createPostSchema.safeParse({
        caption: "ช่วยตามหา",
        description: "พบแมวอยู่ใกล้ประตูมหาวิทยาลัย",
        media: Array.from({ length: 11 }, (_, index) => ({
          mediaUrl: `https://example.com/${index}.jpg`,
          mediaType: "IMAGE",
        })),
      }).success
    ).toBe(false);
  });
});
