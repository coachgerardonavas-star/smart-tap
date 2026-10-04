export const customerThemes = ["elegante", "calido", "moderno", "colorido"] as const;

export type CustomerTheme = (typeof customerThemes)[number];

export const defaultCustomerBenefits = [
  "Ofertas para clientes",
  "Sorpresas en tu cumpleaños",
  "Te reconocemos al volver",
] as const;

export const customerThemeCopy: Record<CustomerTheme, {
  heroTitle: string;
  formTitle: string;
  formLead: string;
  submitLabel: string;
}> = {
  elegante: {
    heroTitle: "Únete a nuestro club de clientes",
    formTitle: "Regístrate en segundos",
    formLead: "Así te reconocemos cuando vuelvas.",
    submitLabel: "Unirme al club",
  },
  calido: {
    heroTitle: "Únete al club de la casa",
    formTitle: "Cuéntanos quién eres",
    formLead: "Así te reconocemos en tu próxima visita.",
    submitLabel: "Registrar mi visita",
  },
  moderno: {
    heroTitle: "",
    formTitle: "TUS DATOS",
    formLead: "Te toma menos de un minuto.",
    submitLabel: "REGISTRAR MI VISITA",
  },
  colorido: {
    heroTitle: "¡Únete al club!",
    formTitle: "¿Cómo te llamas?",
    formLead: "Así te saludamos cuando vuelvas.",
    submitLabel: "Registrar mi visita",
  },
};

export function isCustomerTheme(value: unknown): value is CustomerTheme {
  return typeof value === "string" && customerThemes.includes(value as CustomerTheme);
}

export function resolveCustomerBenefits(value: string[] | null | undefined): string[] {
  return value?.length === 3 ? value : [...defaultCustomerBenefits];
}

export function businessInitials(name: string): string {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
  return (initials || "ST").toLocaleUpperCase("es-US");
}

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("El color debe usar formato #RRGGBB.");
  const red = channelToLinear(Number.parseInt(color.slice(1, 3), 16));
  const green = channelToLinear(Number.parseInt(color.slice(3, 5), 16));
  const blue = channelToLinear(Number.parseInt(color.slice(5, 7), 16));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const light = Math.max(firstLuminance, secondLuminance);
  const dark = Math.min(firstLuminance, secondLuminance);
  return (light + 0.05) / (dark + 0.05);
}

export function buttonTextColor(background: string): "#000000" | "#FFFFFF" {
  const dark = contrastRatio(background, "#000000");
  const light = contrastRatio(background, "#FFFFFF");
  return dark >= light ? "#000000" : "#FFFFFF";
}
