# Architecture

## Runtime

Astro 7 renders public and private pages on the server through the standalone Node adapter. React powers the check-in form because it needs client state. The remaining UI stays in Astro.

Supabase provides PostgreSQL and Auth. The browser receives no direct database client in the MVP. Server routes validate identity and tenant access before using the Supabase secret client. RLS stays active as a second barrier for authenticated Data API access and future client features.

## Request flow

```text
NFC URL
  -> GET /b/{slug}?t={tag-code}
  -> server reads public business branding
  -> POST /api/public/check-in
  -> Zod validation + phone normalization + keyed IP hash
  -> service-only PostgreSQL function
  -> rate limit + customer upsert + consent insert + visit insert
  -> confirmation
```

```text
Business user
  -> Supabase Auth cookie
  -> verified claims
  -> profile + membership check
  -> server query scoped to business_id
  -> dashboard
```

## Tenant model

`businesses` is the tenant root. `business_members`, `nfc_tags`, `customers`, `consent_records`, `visits`, and `audit_log` carry a business reference. Customer phone uniqueness is `(business_id, phone_e164)`, so the same person may visit two businesses without linking their records.

Private helper functions evaluate platform role and active membership. They live in the `private` schema, set an empty search path, revoke public execution, and expose only the minimum calls to `authenticated`.

The aggregate view uses `security_invoker = true`, so its source-table RLS remains in force.

## Security boundaries

- `SUPABASE_SECRET_KEY` and `CHECK_IN_HASH_SECRET` stay server-side.
- The public API accepts a slug and tag code, never a caller-supplied business UUID.
- The check-in function is revoked from `public`, `anon`, and `authenticated`; only `service_role` may run it.
- PostgreSQL applies ten-minute windows per business: 40 requests per keyed client IP and 3 per keyed phone. The client IP comes from the socket, or from the single proxy header named in `TRUSTED_IP_HEADER`.
- Server configuration is read at request time through `astro:env/server` (`src/lib/env.ts`). Nothing secret is compiled into `dist/`.
- Session cookies are HTTP-only, and `Secure` when `PUBLIC_SITE_URL` uses HTTPS.
- Admin and customer-deletion routes validate the authenticated user on the server.
- Astro checks request origins for state-changing form posts.
- Security headers block framing, MIME sniffing, unnecessary browser permissions, and broad content sources.
- Admin mutations write an audit record.

## Deployment shape

The build output is a portable Node server in `dist/server/entry.mjs`. A production host needs HTTPS, the environment values in `.env.example`, and a reachable Supabase project. Use one application deployment for every tenant.
