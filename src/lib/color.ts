// Accepts how people really write a brand color ("1a73e8", "#abc", " #1A73E8 ")
// and returns canonical "#RRGGBB" in upper case, or null when it is not a color.
export function normalizeHexColor(value: string): string | null {
  const digits = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(digits)) {
    return `#${digits.split("").map((digit) => digit + digit).join("")}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(digits)) return `#${digits}`.toUpperCase();
  return null;
}
