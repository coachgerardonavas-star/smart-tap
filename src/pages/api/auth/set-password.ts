import type { APIRoute } from "astro";
import { requireAuth } from "../../../lib/auth";
import { createSupabaseServerClient } from "../../../lib/supabase";
import { passwordInputSchema } from "../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  await requireAuth(request, cookies);
  const form = await request.formData();
  const parsed = passwordInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return redirect(`/set-password?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Revisa la contraseña.")}`, 303);
  const supabase = createSupabaseServerClient(request, cookies);
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return redirect(`/set-password?error=${encodeURIComponent("No pudimos guardar la contraseña.")}`, 303);
  return redirect("/dashboard", 303);
};
