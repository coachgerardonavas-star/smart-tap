import type { CustomerTheme } from "./customer-theme";

export const businessTypes = ["restaurante", "cafe", "panaderia", "barberia", "salon", "heladeria", "tienda", "gimnasio"] as const;
export type BusinessType = (typeof businessTypes)[number];

export type BusinessPreset = {
  label: string;
  icon: BusinessType;
  theme: CustomerTheme;
  tagline: string;
  benefits: [string, string, string];
  photos: [string, string, string];
};

const photos = (type: BusinessType) => [1, 2, 3].map((number) => `/stock/${type}/${type}-${number}.webp`) as [string, string, string];

export const businessPresets: Record<BusinessType, BusinessPreset> = {
  restaurante: { label: "Restaurante", icon: "restaurante", theme: "elegante", tagline: "Buena comida, mejores momentos", benefits: ["Promociones especiales", "Te reconocemos al volver", "Sorpresas en tu cumpleaños"], photos: photos("restaurante") },
  cafe: { label: "Café", icon: "cafe", theme: "calido", tagline: "Momentos que se quedan", benefits: ["Ofertas para clientes", "Te reconocemos al volver", "Sorpresas en tu cumpleaños"], photos: photos("cafe") },
  panaderia: { label: "Panadería", icon: "panaderia", theme: "calido", tagline: "Recién hecho para ti", benefits: ["Especiales de la casa", "Te reconocemos al volver", "Sorpresas en tu cumpleaños"], photos: photos("panaderia") },
  barberia: { label: "Barbería", icon: "barberia", theme: "moderno", tagline: "Corte, barba y estilo", benefits: ["Ofertas para clientes", "Tus visitas quedan guardadas", "Un detalle en tu cumpleaños"], photos: photos("barberia") },
  salon: { label: "Salón de belleza", icon: "salon", theme: "elegante", tagline: "Tu momento para brillar", benefits: ["Beneficios para clientes", "Te reconocemos al volver", "Un detalle en tu cumpleaños"], photos: photos("salon") },
  heladeria: { label: "Heladería", icon: "heladeria", theme: "colorido", tagline: "¡Hecho con amor!", benefits: ["Sabores nuevos primero", "Te reconocemos al volver", "Sorpresas en tu cumple"], photos: photos("heladeria") },
  tienda: { label: "Tienda", icon: "tienda", theme: "moderno", tagline: "Siempre algo nuevo", benefits: ["Ofertas para clientes", "Novedades de la tienda", "Un detalle en tu cumpleaños"], photos: photos("tienda") },
  gimnasio: { label: "Gimnasio", icon: "gimnasio", theme: "moderno", tagline: "Cada visita cuenta", benefits: ["Beneficios para miembros", "Tu constancia queda registrada", "Un detalle en tu cumpleaños"], photos: photos("gimnasio") },
};

export const customerThemeColors: Record<CustomerTheme, readonly [string, string, string, string]> = {
  elegante: ["#C9A45C", "#9C7B3E", "#7D5A2B", "#B28B42"],
  calido: ["#C8412A", "#9E3A24", "#6B4226", "#D97745"],
  moderno: ["#FF6A2B", "#19C37D", "#3B82F6", "#EAB308"],
  colorido: ["#3A1240", "#FF6F9E", "#2EC4B6", "#7C3AED"],
};

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === "string" && businessTypes.includes(value as BusinessType);
}

