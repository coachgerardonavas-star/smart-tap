import type { AuthIdentity } from "./auth";
import { buildFollowUpOpportunities, buildWhatsAppUrl, type FollowUpCustomer, type FollowUpKind, type FollowUpStatus } from "./follow-up";
import type { Business, Visit } from "./types";

export class FollowUpActionError extends Error {
  constructor(public readonly status: 400 | 404 | 409, message: string) {
    super(message);
  }
}

type FollowUpBusiness = Pick<Business, "id" | "slug" | "display_name" | "timezone" | "inactivity_days">;

type FollowUpStore = {
  getBusiness(businessId: string): Promise<FollowUpBusiness | null>;
  getCustomer(businessId: string, customerId: string): Promise<FollowUpCustomer | null>;
  getVisits(businessId: string, customerId: string): Promise<Visit[]>;
  getVisitCount(businessId: string, customerId: string): Promise<number>;
  recordAction(input: {
    business_id: string;
    customer_id: string;
    kind: FollowUpKind;
    period_key: string;
    status: FollowUpStatus;
    actor_user_id: string;
  }): Promise<void>;
};

type ActionDependencies = {
  authorize(identity: AuthIdentity, businessId: string): Promise<unknown>;
  store: FollowUpStore;
  now?: Date;
};

export async function executeFollowUpAction(
  identity: AuthIdentity,
  input: { businessId: string; customerId: string; kind: FollowUpKind; action: "contact" | "dismiss" },
  dependencies: ActionDependencies,
): Promise<{ redirectUrl: string }> {
  await dependencies.authorize(identity, input.businessId);
  const business = await dependencies.store.getBusiness(input.businessId);
  if (!business) throw new FollowUpActionError(404, "Negocio no encontrado.");
  const customer = await dependencies.store.getCustomer(input.businessId, input.customerId);
  if (!customer) throw new FollowUpActionError(404, "Cliente no encontrado.");
  if (input.action === "contact" && !customer.whatsapp_opt_in) {
    throw new FollowUpActionError(409, "El cliente no autorizó mensajes por WhatsApp.");
  }

  const [visits, visitCount] = await Promise.all([
    dependencies.store.getVisits(input.businessId, input.customerId),
    dependencies.store.getVisitCount(input.businessId, input.customerId),
  ]);
  const opportunity = buildFollowUpOpportunities({
    customers: [customer],
    visits,
    visitCounts: { [customer.id]: visitCount },
    businessName: business.display_name,
    timezone: business.timezone,
    inactivityDays: business.inactivity_days,
    now: dependencies.now,
  }).find((item) => item.kind === input.kind);
  if (!opportunity) throw new FollowUpActionError(409, "Esta oportunidad ya no está disponible.");

  await dependencies.store.recordAction({
    business_id: business.id,
    customer_id: customer.id,
    kind: opportunity.kind,
    period_key: opportunity.periodKey,
    status: input.action === "contact" ? "contacted" : "dismissed",
    actor_user_id: identity.id,
  });

  return {
    redirectUrl: input.action === "contact"
      ? buildWhatsAppUrl(customer.phone_e164, opportunity.message)
      : `/dashboard?business=${encodeURIComponent(business.slug)}`,
  };
}
