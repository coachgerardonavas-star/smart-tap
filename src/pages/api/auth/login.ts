import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase";
import { loginInputSchema, safeNextPath } from "../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const parsed = loginInputSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  const next = safeNextPath(form.get("next"));
  if (!parsed.success) return redirect(`/login?error=1&next=${encodeURIComponent(next)}`, 303);

  const supabase = createSupabaseServerClient(request, cookies);
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return redirect(`/login?error=1&next=${encodeURIComponent(next)}`, 303);
  return redirect(next, 303);
};
