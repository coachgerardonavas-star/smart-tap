import type { APIRoute } from "astro";
import { siteUrl } from "../../../lib/env";
import { createSupabaseServerClient } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  if (email.includes("@") && email.length <= 254) {
    const supabase = createSupabaseServerClient(request, cookies);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/set-password`,
    });
  }
  return redirect("/forgot-password?sent=1", 303);
};
