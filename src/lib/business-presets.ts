import type { CustomerTheme } from "./customer-theme";

// D-057: business types and the values the admin pre-fills when one is chosen.
// Every value stays editable; the presets are suggestions, never enforced.
export const businessTypes = ["restaurante", "cafe", "panaderia", "barberia", "salon", "heladeria", "tienda", "gimnasio"] as const;

export type BusinessType = (typeof businessTypes)[number];

export type BusinessIcon = "utensils" | "cup" | "bread" | "cone" | "blade" | "comb" | "store" | "dumbbell";

export type BusinessPreset = {
  label: string;
  icon: BusinessIcon;
  theme: CustomerTheme;
  tagline: string;
  benefits: [string, string, string];
  inactivityDays: number;
  photos: [string, string, string];
};

const stockPhotos = (type: BusinessType, prefix: string): [string, string, string] =>
  [1, 2, 3].map((index) => `/stock/${type}/${prefix}-${index}.webp`) as [string, string, string];

export const businessPresets: Record<BusinessType, BusinessPreset> = {
  restaurante: {
    label: "Restaurante",
    icon: "utensils",
    theme: "elegante",
    tagline: "Buena comida, mejores momentos",
    benefits: ["Promociones especiales", "Te reconocemos al volver", "Sorpresa en tu cumpleaños"],
    inactivityDays: 21,
    photos: stockPhotos("restaurante", "restaurante"),
  },
  cafe: {
    label: "Café",
    icon: "cup",
    theme: "calido",
    tagline: "Momentos que se quedan",
    benefits: ["Ofertas para clientes", "Te reconocemos al volver", "Sorpresa en tu cumpleaños"],
    inactivityDays: 14,
    photos: stockPhotos("cafe", "cafe"),
  },
  panaderia: {
    label: "Panadería",
    icon: "bread",
    theme: "calido",
    tagline: "Recién horneado, como en casa",
    benefits: ["Ofertas para clientes", "Te reconocemos al volver", "Un detalle en tu cumpleaños"],
    inactivityDays: 14,
    photos: stockPhotos("panaderia", "panaderia"),
  },
  heladeria: {
    label: "Heladería",
    icon: "cone",
    theme: "colorido",
    tagline: "¡Hecho con amor!",
    benefits: ["Ofertas para clientes", "Te recordamos al volver", "Sorpresa en tu cumple"],
    inactivityDays: 21,
    photos: stockPhotos("heladeria", "heladeria"),
  },
  barberia: {
    label: "Barbería",
    icon: "blade",
    theme: "moderno",
    tagline: "Corte · Barba · Estilo",
    benefits: ["Ofertas para clientes", "Sin tarjetas de papel", "Un detalle en tu cumpleaños"],
    inactivityDays: 35,
    photos: stockPhotos("barberia", "barberia"),
  },
  salon: {
    label: "Salón de belleza",
    icon: "comb",
    theme: "elegante",
    tagline: "Tu momento para ti",
    benefits: ["Promociones especiales", "Te reconocemos al volver", "Sorpresa en tu cumpleaños"],
    inactivityDays: 30,
    photos: stockPhotos("salon", "salon"),
  },
  tienda: {
    label: "Tienda",
    icon: "store",
    theme: "moderno",
    tagline: "Siempre algo nuevo",
    benefits: ["Ofertas para clientes", "Novedades de la tienda", "Un detalle en tu cumpleaños"],
    inactivityDays: 30,
    photos: stockPhotos("tienda", "tienda"),
  },
  gimnasio: {
    label: "Gimnasio",
    icon: "dumbbell",
    theme: "moderno",
    tagline: "Cada visita cuenta",
    benefits: ["Beneficios para miembros", "Tu constancia queda registrada", "Un detalle en tu cumpleaños"],
    inactivityDays: 14,
    photos: stockPhotos("gimnasio", "gimnasio"),
  },
};

export const stockPhotoPattern = /^\/stock\/[a-z_]+\/[a-z0-9-]+\.webp$/;

export const stockPhotoLibrary: string[] = businessTypes.flatMap((type) => businessPresets[type].photos);

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === "string" && businessTypes.includes(value as BusinessType);
}

export function resolveBusinessType(value: unknown): BusinessType {
  return isBusinessType(value) ? value : "cafe";
}
