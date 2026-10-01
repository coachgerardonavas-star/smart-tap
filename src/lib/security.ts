import { createHmac, timingSafeEqual } from "node:crypto";

export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("cf-connecting-ip") || "unknown";
}

export function hashIdentifier(value: string): string {
  const secret = import.meta.env.CHECK_IN_HASH_SECRET;
  if (!secret || secret.length < 32) throw new Error("CHECK_IN_HASH_SECRET must contain at least 32 characters");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function equalSecret(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
