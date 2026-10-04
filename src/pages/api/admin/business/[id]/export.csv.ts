import type { APIRoute } from "astro";
import { requirePlatformAdmin } from "../../../../../lib/auth";
import { buildCustomerExportCsv } from "../../../../../lib/csv";
import { customerExportIsAvailable, fetchAllPages } from "../../../../../lib/pagination";
import { createSupabaseServiceClient } from "../../../../../lib/supabase";
import { businessIdSchema } from "../../../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, params }) => {
  const identity = await requirePlatformAdmin(request, cookies);
  const parsedId = businessIdSchema.safeParse(params.id);
  if (!parsedId.success) return new Response("Negocio no encontrado.", { status: 404 });

  const service = createSupabaseServiceClient();
  const businessResult = await service.from("businesses").select("slug,cancelled_at").eq("id", parsedId.data).maybeSingle();
  if (businessResult.error || !businessResult.data) return new Response("Negocio no encontrado.", { status: 404 });
  if (!customerExportIsAvailable(businessResult.data.cancelled_at)) {
    return new Response("La ventana de descarga de 30 días terminó.", { status: 410 });
  }

  let customers;
  let countsRows;
  try {
    [customers, countsRows] = await Promise.all([
      fetchAllPages((from, to) => service.from("customers")
        .select("id,full_name,phone_e164,birthday,whatsapp_opt_in")
        .eq("business_id", parsedId.data)
        .order("created_at")
        .order("id")
        .range(from, to)),
      fetchAllPages((from, to) => service.from("customer_visit_counts")
        .select("customer_id,visit_count,last_visit_at")
        .eq("business_id", parsedId.data)
        .order("customer_id")
        .range(from, to)),
    ]);
  } catch {
    return new Response("No pudimos preparar el archivo.", { status: 500 });
  }

  const counts = new Map(countsRows.map((row) => [row.customer_id, row]));
  const csv = buildCustomerExportCsv(customers.map((customer) => {
    const count = counts.get(customer.id);
    return {
      fullName: customer.full_name,
      phone: customer.phone_e164,
      birthday: customer.birthday,
      visitCount: Number(count?.visit_count ?? 0),
      lastVisit: count?.last_visit_at ?? null,
      whatsappOptIn: customer.whatsapp_opt_in,
    };
  }));

  const { error: auditError } = await service.from("audit_log").insert({
    actor_user_id: identity.id,
    business_id: parsedId.data,
    action: "business.customers_exported",
    entity_type: "business",
    entity_id: parsedId.data,
    details: {},
  });
  if (auditError) return new Response("No pudimos registrar la descarga.", { status: 500 });

  return new Response(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="smart-tap-${businessResult.data.slug}-clientes.csv"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
};
