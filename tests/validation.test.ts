import { describe, expect, it } from "vitest";
import { businessInputSchema, checkInInputSchema, normalizePhone, safeNextPath } from "../src/lib/validation";

describe("public check-in validation", () => {
  it("accepts a complete check-in and rejects missing consent", () => {
    const valid = { slug: "cafe-luna", tagCode: "demo-cafe-luna-main-2026", fullName: "Elena García", phone: "305-555-0101", birthday: "1992-10-15", consent: true, consentVersion: "2026-10-01" };
    expect(checkInInputSchema.safeParse(valid).success).toBe(true);
    expect(checkInInputSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });

  it("rejects a slug that could alter a query or route", () => {
    const parsed = checkInInputSchema.safeParse({ slug: "../other-business", fullName: "Test User", phone: "+13055550101", birthday: "", consent: true, consentVersion: "1" });
    expect(parsed.success).toBe(false);
  });

  it("normalizes valid US numbers and rejects invalid numbers", () => {
    expect(normalizePhone("(305) 555-0101", "US")).toBe("+13055550101");
    expect(normalizePhone("123", "US")).toBeNull();
  });
});

describe("admin validation", () => {
  it("accepts configuration fields and rejects unsafe colors", () => {
    const valid = { displayName: "Café Luna", legalName: "", slug: "cafe-luna", logoUrl: "", privacyUrl: "/privacy", primaryColor: "#155EEF", secondaryColor: "#0B1220", timezone: "America/New_York", defaultCountry: "us", inactivityDays: "45", ownerEmail: "owner@example.com" };
    expect(businessInputSchema.safeParse(valid).success).toBe(true);
    expect(businessInputSchema.safeParse({ ...valid, primaryColor: "red; background:url(x)" }).success).toBe(false);
  });

  it("allows only local redirect paths", () => {
    expect(safeNextPath("/dashboard?business=cafe-luna")).toBe("/dashboard?business=cafe-luna");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
  });
});
