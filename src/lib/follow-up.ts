import type { Customer, Visit } from "./types";

export const FOLLOW_UP_KINDS = ["inactive", "birthday", "frequent", "new"] as const;
export type FollowUpKind = (typeof FOLLOW_UP_KINDS)[number];
export type FollowUpStatus = "contacted" | "dismissed";

export const FOLLOW_UP_KIND_LABELS: Record<FollowUpKind, string> = {
  inactive: "Hace tiempo que no viene",
  birthday: "Cumpleaños próximo",
  frequent: "Cliente frecuente",
  new: "Cliente nuevo",
};

export type FollowUpCustomer = Customer & {
  whatsapp_opt_in: boolean;
  whatsapp_opt_in_at: string | null;
};

export type FollowUpActionRecord = {
  customer_id: string;
  kind: FollowUpKind;
  period_key: string;
};

export type FollowUpOpportunity = {
  customer: FollowUpCustomer;
  kind: FollowUpKind;
  periodKey: string;
  reason: string;
  lastVisit: string;
  message: string;
};

type BuildInput = {
  customers: FollowUpCustomer[];
  visits: Visit[];
  actions?: FollowUpActionRecord[];
  visitCounts?: Record<string, number>;
  businessName: string;
  timezone: string;
  inactivityDays: number;
  now?: Date;
};

const DAY_MS = 86_400_000;
const stopMessage = "Si prefieres no recibir mensajes, responde BAJA.";

export function buildFollowUpOpportunities(input: BuildInput): FollowUpOpportunity[] {
  const now = input.now ?? new Date();
  const todayKey = dateKey(now, input.timezone);
  const todayOrdinal = dateOrdinal(todayKey);
  const currentYearMonth = todayKey.slice(0, 7);
  const visitsByCustomer = new Map<string, Visit[]>();
  const handled = new Set((input.actions ?? []).map((action) => actionKey(action.customer_id, action.kind, action.period_key)));

  for (const visit of input.visits) {
    const rows = visitsByCustomer.get(visit.customer_id) ?? [];
    rows.push(visit);
    visitsByCustomer.set(visit.customer_id, rows);
  }

  const opportunities: FollowUpOpportunity[] = [];
  for (const customer of input.customers) {
    const visits = (visitsByCustomer.get(customer.id) ?? []).sort((a, b) => Date.parse(b.visited_at) - Date.parse(a.visited_at));
    const totalVisits = input.visitCounts?.[customer.id] ?? visits.length;
    const lastVisit = visits[0]?.visited_at ?? customer.last_seen_at;
    const lastVisitKey = dateKey(new Date(lastVisit), input.timezone);
    const daysSinceLastVisit = todayOrdinal - dateOrdinal(lastVisitKey);

    if (daysSinceLastVisit >= input.inactivityDays) {
      addOpportunity(opportunities, handled, customer, "inactive", lastVisitKey,
        `Sin venir hace ${daysSinceLastVisit} días`, lastVisit, input.businessName);
    }

    if (customer.birthday) {
      const birthday = nextBirthday(customer.birthday, todayKey);
      if (birthday && birthday.daysUntil <= 7) {
        const reason = birthday.daysUntil === 0 ? "Cumple hoy" : `Cumple el ${shortDate(birthday.dateKey)}`;
        addOpportunity(opportunities, handled, customer, "birthday", String(birthday.year), reason, lastVisit, input.businessName);
      }
    }

    const recentVisitCount = visits.filter((visit) => {
      const daysAgo = todayOrdinal - dateOrdinal(dateKey(new Date(visit.visited_at), input.timezone));
      return daysAgo >= 0 && daysAgo < 30;
    }).length;
    if (recentVisitCount >= 4) {
      addOpportunity(opportunities, handled, customer, "frequent", currentYearMonth,
        `${recentVisitCount} visitas en los últimos 30 días`, lastVisit, input.businessName);
    }

    if (totalVisits === 1 && daysSinceLastVisit >= 0 && daysSinceLastVisit <= 3) {
      addOpportunity(opportunities, handled, customer, "new", "first",
        "Primera visita reciente", lastVisit, input.businessName);
    }
  }

  return opportunities.sort((left, right) => {
    const kindOrder = FOLLOW_UP_KINDS.indexOf(left.kind) - FOLLOW_UP_KINDS.indexOf(right.kind);
    return kindOrder || Date.parse(right.lastVisit) - Date.parse(left.lastVisit);
  });
}

export function buildWhatsAppUrl(phoneE164: string, message: string): string {
  if (!/^\+[1-9][0-9]{6,14}$/.test(phoneE164)) throw new Error("Invalid E.164 phone");
  const digits = phoneE164.slice(1);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function addOpportunity(
  result: FollowUpOpportunity[],
  handled: Set<string>,
  customer: FollowUpCustomer,
  kind: FollowUpKind,
  periodKey: string,
  reason: string,
  lastVisit: string,
  businessName: string,
) {
  if (handled.has(actionKey(customer.id, kind, periodKey))) return;
  result.push({
    customer,
    kind,
    periodKey,
    reason,
    lastVisit,
    message: suggestedMessage(kind, firstName(customer.full_name), businessName),
  });
}

function suggestedMessage(kind: FollowUpKind, name: string, businessName: string): string {
  const body: Record<FollowUpKind, string> = {
    inactive: `Hola ${name}, te extrañamos en ${businessName}. ¡Te esperamos pronto!`,
    birthday: `¡Feliz cumpleaños, ${name}! En ${businessName} queremos celebrarlo contigo.`,
    frequent: `Gracias por visitarnos tan seguido, ${name}. En ${businessName} valoramos mucho tu preferencia.`,
    new: `¡Gracias por tu primera visita a ${businessName}, ${name}! Esperamos verte pronto.`,
  };
  return `${body[kind]} ${stopMessage}`;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "cliente";
}

function actionKey(customerId: string, kind: FollowUpKind, periodKey: string): string {
  return `${customerId}:${kind}:${periodKey}`;
}

function dateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function dateOrdinal(value: string): number {
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function nextBirthday(birthday: string, todayKey: string): { dateKey: string; daysUntil: number; year: number } | null {
  const [, month = 0, day = 0] = birthday.split("-").map(Number);
  const [currentYear = 0] = todayKey.split("-").map(Number);
  const today = dateOrdinal(todayKey);
  for (let year = currentYear; year <= currentYear + 4; year += 1) {
    const candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const date = new Date(`${candidate}T00:00:00Z`);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) continue;
    const daysUntil = dateOrdinal(candidate) - today;
    if (daysUntil >= 0) return { dateKey: candidate, daysUntil, year };
  }
  return null;
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("es-US", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`))
    .replace(".", "");
}
