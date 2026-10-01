import type { APIRoute } from "astro";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../../lib/supabase";
import { safeNextPath } from "../../lib/validation";

export const GET: APIRoute = async ({ request, cookies, url, redirect }) => {
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNextPath(url.searchParams.get("next"));
  const supabase = createSupabaseServerClient(request, cookies);
  let error: Error | null = null;
  if (tokenHash && type && ["invite", "recovery", "email", "signup", "magiclink"].includes(type)) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    error = result.error;
  } else if (code) {
    const flowId = url.searchParams.get("sb_flow_id");
    const result = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    error = result.error;
  } else {
    return redirect("/login?error=1", 303);
  }
  if (error) return redirect("/login?error=1", 303);
  return redirect(next, 303);
};
