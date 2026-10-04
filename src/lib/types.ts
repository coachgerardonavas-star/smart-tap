export type Business = {
  id: string;
  slug: string;
  display_name: string;
  legal_name: string | null;
  logo_url: string | null;
  privacy_url: string | null;
  primary_color: string;
  secondary_color: string;
  timezone: string;
  default_country: string;
  inactivity_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  business_id: string;
  full_name: string;
  phone_e164: string;
  birthday: string | null;
  consent_current: boolean;
  consent_at: string;
  whatsapp_opt_in: boolean;
  whatsapp_opt_in_at: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
};

export type Visit = {
  id: string;
  business_id: string;
  customer_id: string;
  tag_id: string | null;
  source: "nfc" | "manual" | "demo";
  visited_at: string;
};

export type BusinessMembership = {
  business_id: string;
  user_id: string;
  role: "owner" | "manager" | "viewer";
  is_active: boolean;
};

export type DashboardCustomer = Customer & {
  visitCount: number;
};
