import type { CustomerTheme } from "./customer-theme";

export type Business = {
  id: string;
  slug: string;
  display_name: string;
  legal_name: string | null;
  logo_url: string | null;
  privacy_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  primary_color: string;
  secondary_color: string;
  timezone: string;
  default_country: string;
  inactivity_days: number;
  is_active: boolean;
  offer_inactive: string | null;
  offer_birthday: string | null;
  offer_frequent: string | null;
  offer_new: string | null;
  google_review_url: string | null;
  theme: CustomerTheme;
  tagline: string | null;
  benefits: string[] | null;
  hero_image_url: string | null;
  owner_approved_at: string | null;
  owner_approved_name: string | null;
  owner_approved_terms_version: string | null;
  term_ends_at: string | null;
  cancelled_at: string | null;
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
  whatsapp_opted_out_at: string | null;
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
  untagged: boolean;
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
