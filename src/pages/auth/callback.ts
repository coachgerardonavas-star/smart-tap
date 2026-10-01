import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase";
import { safeNextPath } from "../../lib/validation";

export const GET: APIRoute = async ({ request, cookies, url, redirect }) => {
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  if (!code) return redirect("/login?error=1", 303);
  const supabase = createSupabaseServerClient(request, cookies);
  const flowId = url.searchParams.get("sb_flow_id");
  const { error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
  if (error) return redirect("/login?error=1", 303);
  return redirect(next, 303);
};
