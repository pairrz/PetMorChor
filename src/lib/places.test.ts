import { describe, expect, it } from "vitest";
import { getPlacesQuerySchema, isWithinRadiusKm } from "./places";

describe("getPlacesQuerySchema", () => {
  it("coerces coordinates and supplies the default radius", () => {
    expect(
      getPlacesQuerySchema.parse({ userLat: "18.7883", userLng: "98.9853" })
    ).toEqual({
      userLat: 18.7883,
      userLng: 98.9853,
      radiusKm: 5,
    });
  });

  it("rejects coordinates and radii outside valid bounds", () => {
    expect(getPlacesQuerySchema.safeParse({ userLat: "91" }).success).toBe(false);
    expect(getPlacesQuerySchema.safeParse({ userLng: "-181" }).success).toBe(false);
    expect(getPlacesQuerySchema.safeParse({ radiusKm: "31" }).success).toBe(false);
  });
});

describe("isWithinRadiusKm", () => {
  it("includes places inside or exactly on the radius", () => {
    expect(isWithinRadiusKm(18.7883, 98.9853, 18.7883, 98.9853, 5)).toBe(true);
    expect(isWithinRadiusKm(0.05, 0, 0, 0, 0.05 * 111)).toBe(true);
  });

  it("excludes places outside the radius", () => {
    expect(isWithinRadiusKm(0.051, 0, 0, 0, 5.55)).toBe(false);
  });

  it("accounts for longitude distance at the user's latitude", () => {
    const longitudeOffset = 0.05;
    const distanceAtEquator = isWithinRadiusKm(
      0,
      longitudeOffset,
      0,
      0,
      longitudeOffset * 111
    );
    const distanceAtChiangMai = isWithinRadiusKm(
      18.7883,
      98.9853 + longitudeOffset,
      18.7883,
      98.9853,
      5.55
    );

    expect(distanceAtEquator).toBe(true);
    expect(distanceAtChiangMai).toBe(true);
  });
});
