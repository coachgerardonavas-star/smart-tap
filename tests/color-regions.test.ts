import { describe, expect, it } from "vitest";
import { normalizeHexColor } from "../src/lib/color";
import { countryOptions, timezoneOptions } from "../src/lib/regions";

describe("normalizeHexColor", () => {
  it("normalizes 3 and 6 digit colors", () => {
    expect(normalizeHexColor("1a73e8")).toBe("#1A73E8");
    expect(normalizeHexColor(" #abc ")).toBe("#AABBCC");
  });
  it("rejects anything else", () => {
    for (const bad of ["", "red", "#12", "#1234567", "#ggg", "#fff;x"]) expect(normalizeHexColor(bad)).toBeNull();
  });
});

describe("regions", () => {
  it("lists US first and keeps the current timezone", () => {
    expect(countryOptions()[0]?.value).toBe("US");
    expect(timezoneOptions("Asia/Tokyo").some((option) => option.value === "Asia/Tokyo")).toBe(true);
    expect(timezoneOptions("America/New_York").filter((option) => option.value === "America/New_York")).toHaveLength(1);
  });
});
