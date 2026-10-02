import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "./env";

// Client-supplied headers are untrusted. Only the header named in TRUSTED_IP_HEADER,
// written by the proxy in front of this server, may replace the socket address.
export function requestIp(request: Request, clientAddress: string | undefined, trustedHeader = serverEnv("TRUSTED_IP_HEADER")): string {
  const header = trustedHeader?.trim().toLowerCase();
  if (header) {
    // The last entry is the one appended by the nearest proxy; earlier entries come from the client.
    const value = request.headers.get(header)?.split(",").map((part) => part.trim()).filter(Boolean).at(-1);
    if (value) return value;
  }
  return clientAddress || "unknown";
}

export function hashIdentifier(value: string): string {
  const secret = serverEnv("CHECK_IN_HASH_SECRET");
  if (!secret || secret.length < 32) throw new Error("CHECK_IN_HASH_SECRET must contain at least 32 characters");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function equalSecret(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
