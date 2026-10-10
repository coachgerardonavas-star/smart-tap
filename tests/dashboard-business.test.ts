import { describe, expect, it } from "vitest";
import { selectDashboardBusiness } from "../src/lib/dashboard-business";

const a = { slug: "business-a" };
const b = { slug: "business-b" };
describe("explicit dashboard business selection", () => {
  it("selects the only accessible business when the link has no slug", () => {
    expect(selectDashboardBusiness([a])).toBe(a);
  });
  it("requires a choice when multiple businesses are accessible", () => {
    expect(selectDashboardBusiness([a, b])).toBeNull();
    expect(selectDashboardBusiness([b, a], null)).toBeNull();
  });
  it("resolves the explicit business independently of ordering", () => {
    expect(selectDashboardBusiness([a, b], b.slug)).toBe(b);
    expect(selectDashboardBusiness([b, a], b.slug)).toBe(b);
  });
  it.each(["unknown", "", "business-b"])("does not fall back for unavailable slug %s", (slug) => {
    expect(selectDashboardBusiness([a], slug)).toBeNull();
  });
  it("shows no data without any accessible business", () => {
    expect(selectDashboardBusiness([])).toBeNull();
  });
});
