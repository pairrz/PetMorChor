import { describe, expect, it } from "vitest";
import {
  createListingSchema,
  getListingsQuerySchema,
  updateListingStatusSchema,
} from "./listing";

describe("getListingsQuerySchema", () => {
  it("applies defaults and coerces query parameters", () => {
    expect(getListingsQuerySchema.parse({ limit: "4", cursor: "12" })).toEqual({
      status: "AVAILABLE",
      limit: 4,
      cursor: 12,
    });
  });

  it("rejects limits outside the allowed range", () => {
    expect(getListingsQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
    expect(getListingsQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
  });

  it("rejects unsupported listing types", () => {
    expect(getListingsQuerySchema.safeParse({ type: "OTHER" }).success).toBe(false);
  });
});

describe("createListingSchema", () => {
  const validListing = {
    title: "  แมวหาบ้าน  ",
    description: "น้องแมวสุขภาพดี มองหาบ้านที่อบอุ่น",
    species: "แมว",
    type: "ADOPTION",
    mediaUrls: ["https://example.com/cat.jpg"],
  };

  it("trims text and defaults an omitted price to zero", () => {
    expect(createListingSchema.parse(validListing)).toMatchObject({
      title: "แมวหาบ้าน",
      species: "แมว",
      price: 0,
    });
  });

  it("rejects negative prices and invalid media URLs", () => {
    expect(
      createListingSchema.safeParse({
        ...validListing,
        price: -1,
      }).success
    ).toBe(false);
    expect(
      createListingSchema.safeParse({
        ...validListing,
        mediaUrls: ["not-a-url"],
      }).success
    ).toBe(false);
  });
});

describe("updateListingStatusSchema", () => {
  it("accepts known listing statuses and rejects unknown values", () => {
    expect(updateListingStatusSchema.safeParse({ status: "ADOPTED" }).success).toBe(true);
    expect(updateListingStatusSchema.safeParse({ status: "SOLD" }).success).toBe(false);
  });
});
