#!/bin/bash
# D-058 reproduction. Starts a local Supabase stand-in (no real project, no
# real keys) and the built app, then probes the protected routes.
# Usage, after `npm run build`:  scripts/stale-session/probe.sh revoked|valid aal1|aal2
set -u
D=$(cd "$(dirname "$0")" && pwd); APP=$(cd "$D/../.." && pwd); OUT=$(mktemp -d)
for p in $(pgrep -x node); do tr '\0' ' ' < /proc/$p/cmdline | grep -qE "stale-session/mock-supabase.mjs|dist/server/entry.mjs" && kill $p; done
sleep 0.5
MOCK_MODE=$1 MOCK_AAL=$2 COOKIE_FILE=$OUT/cookie.txt setsid nohup node "$D/mock-supabase.mjs" > "$OUT/mock.log" 2>&1 < /dev/null &
(cd "$APP" && PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 PUBLIC_SUPABASE_PUBLISHABLE_KEY=local-placeholder SUPABASE_SECRET_KEY=local-placeholder \
  CHECK_IN_HASH_SECRET=local-placeholder-0123456789abcdef PUBLIC_SITE_URL=http://127.0.0.1:4321 HOST=127.0.0.1 PORT=4321 \
  setsid nohup node dist/server/entry.mjs > "$OUT/app.log" 2>&1 < /dev/null &)
sleep 1; for i in $(seq 1 100); do curl -s -o /dev/null http://127.0.0.1:4321/login && break; sleep 0.1; done
C=$(cat "$OUT/cookie.txt")
for path in /mfa /admin /dashboard /terms/accept /api/dashboard/follow-up; do
  m=GET; [ "$path" = /api/dashboard/follow-up ] && m=POST
  echo "== $m $path"
  curl -s -o "$OUT/body.txt" -D - -X $m -H "Cookie: $C" -H "Origin: http://127.0.0.1:4321" "http://127.0.0.1:4321$path" \
    | grep -iE "^HTTP|^location|^content-type|^set-cookie" | sed -E 's/(auth-token=)[^;]{20,}/\1<value>/'
done
for p in $(pgrep -x node); do tr '\0' ' ' < /proc/$p/cmdline | grep -qE "stale-session/mock-supabase.mjs|dist/server/entry.mjs" && kill $p; done
