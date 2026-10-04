import type { APIRoute } from "astro";
import { assertBusinessAccess, AuthorizationError, requireDataAccess } from "../../../lib/auth";
import { executeFollowUpAction, FollowUpActionError } from "../../../lib/follow-up-handler";
import type { FollowUpCustomer } from "../../../lib/follow-up";
import { createSupabaseServiceClient } from "../../../lib/supabase";
import type { Visit } from "../../../lib/types";
import { followUpActionSchema } from "../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const identity = await requireDataAccess(request, cookies);
  const form = await request.formData();
  const parsed = followUpActionSchema.safeParse({
    businessId: form.get("businessId"),
    customerId: form.get("customerId"),
    kind: form.get("kind"),
    action: form.get("action"),
  });
  if (!parsed.success) return new Response("Solicitud no válida", { status: 400 });

  const service = createSupabaseServiceClient();
  try {
    const result = await executeFollowUpAction(identity, parsed.data, {
      authorize: (currentIdentity, businessId) => assertBusinessAccess(currentIdentity, businessId, false),
      store: {
        async getBusiness(businessId) {
          const { data, error } = await service
            .from("businesses")
            .select("id,slug,display_name,timezone,inactivity_days,offer_inactive,offer_birthday,offer_frequent,offer_new")
            .eq("id", businessId)
            .maybeSingle();
          if (error) throw error;
          return data;
        },
        async getCustomer(businessId, customerId) {
          const { data, error } = await service
            .from("customers")
            .select("*")
            .eq("business_id", businessId)
            .eq("id", customerId)
            .maybeSingle();
          if (error) throw error;
          return data as FollowUpCustomer | null;
        },
        async getVisits(businessId, customerId) {
          const { data, error } = await service
            .from("visits")
            .select("*")
            .eq("business_id", businessId)
            .eq("customer_id", customerId)
            .order("visited_at", { ascending: false })
            .limit(1000);
          if (error) throw error;
          return (data ?? []) as Visit[];
        },
        async getVisitCount(businessId, customerId) {
          const { data, error } = await service
            .from("customer_visit_counts")
            .select("visit_count")
            .eq("business_id", businessId)
            .eq("customer_id", customerId)
            .maybeSingle();
          if (error) throw error;
          return Number(data?.visit_count ?? 0);
        },
        async recordAction(action) {
          const { error } = await service.from("follow_ups").upsert(action, {
            onConflict: "business_id,customer_id,kind,period_key",
            ignoreDuplicates: true,
          });
          if (error) throw error;
        },
      },
    });
    return redirect(result.redirectUrl, 303);
  } catch (error) {
    if (error instanceof AuthorizationError) throw error;
    if (error instanceof FollowUpActionError) return new Response(error.message, { status: error.status });
    console.error("follow-up action failed", error instanceof Error ? error.message : "unknown");
    return new Response("No pudimos guardar esta acción", { status: 500 });
  }
};
