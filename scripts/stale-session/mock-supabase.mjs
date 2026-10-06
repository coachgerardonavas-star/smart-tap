// D-058 reproduction: local stand-in for Supabase Auth and PostgREST. It signs
// an ES256 access token at runtime for a session that Auth reports as revoked.
import { createServer } from "node:http";
import { generateKeyPairSync, sign } from "node:crypto";
import { writeFileSync } from "node:fs";

const mode = process.env.MOCK_MODE || "revoked"; // revoked | valid
const aal = process.env.MOCK_AAL || "aal1";
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-kid", alg: "ES256", use: "sig" };
const b64 = (value) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
const userId = "11111111-1111-4111-8111-111111111111";
const now = Math.floor(Date.now() / 1000);
const header = { alg: "ES256", kid: "test-kid", typ: "JWT" };
const payload = { sub: userId, email: "admin@example.test", role: "authenticated", aal, session_id: "22222222-2222-4222-8222-222222222222", iat: now, exp: now + 3600 };
const unsigned = `${b64(header)}.${b64(payload)}`;
const signature = sign("sha256", Buffer.from(unsigned), { key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
const accessToken = `${unsigned}.${signature}`;
const user = { id: userId, aud: "authenticated", role: "authenticated", email: "admin@example.test", factors: [{ id: "f1", factor_type: "totp", status: "verified", friendly_name: "Smart Tap", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }] };
const session = { access_token: accessToken, refresh_token: "revoked-refresh", token_type: "bearer", expires_in: 3600, expires_at: now + 3600, user };
writeFileSync(process.env.COOKIE_FILE || "cookie.txt", `sb-127-auth-token=base64-${b64(session)}`);

createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  const send = (status, body) => { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(body)); };
  if (url.pathname === "/auth/v1/.well-known/jwks.json") return send(200, { keys: [jwk] });
  if (url.pathname === "/auth/v1/user") {
    if (mode === "revoked") return send(403, { code: 403, error_code: "session_not_found", msg: "Session from session_id claim in JWT does not exist" });
    return send(200, user);
  }
  if (url.pathname === "/auth/v1/token") return send(400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token: Refresh Token Not Found" });
  if (url.pathname === "/auth/v1/logout") { response.writeHead(204); return response.end(); }
  if (url.pathname.startsWith("/rest/v1/profiles")) return send(200, (request.headers.accept || "").includes("pgrst.object") ? { platform_role: "platform_admin" } : [{ platform_role: "platform_admin" }]);
  if (url.pathname.startsWith("/rest/v1/")) return send(200, (request.headers.accept || "").includes("pgrst.object") ? null : []);
  send(404, { message: "not mocked" });
}).listen(54321, "127.0.0.1", () => console.log(`mock ${mode} ${aal} ready`));
