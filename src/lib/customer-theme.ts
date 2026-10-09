export const customerThemes = ["elegante", "calido", "moderno", "colorido"] as const;

export type CustomerTheme = (typeof customerThemes)[number];

export const defaultCustomerBenefits = [
  "Ofertas para clientes",
  "Sorpresas en tu cumpleaños",
  "Te reconocemos al volver",
] as const;

export const customerThemeCopy: Record<CustomerTheme, {
  heroTitle: (businessName: string) => string;
  formTitle: string;
  formLead: string;
  submitLabel: string;
  farewell: string;
}> = {
  elegante: {
    heroTitle: () => "Únete a nuestro club de clientes",
    formTitle: "Regístrate en segundos",
    formLead: "Te tomará menos de un minuto.",
    submitLabel: "Unirme al club",
    farewell: "Gracias por tu visita",
  },
  calido: {
    heroTitle: (businessName) => `Únete al club ${businessName}`,
    formTitle: "¿Cómo te llamas?",
    formLead: "Así te saludamos cuando vuelvas.",
    submitLabel: "Registrar mi visita",
    farewell: "¡Nos vemos pronto!",
  },
  moderno: {
    heroTitle: () => "Regístrate y te tenemos presente",
    formTitle: "Tus datos",
    formLead: "Menos de un minuto.",
    submitLabel: "Registrar mi visita",
    farewell: "Nos vemos pronto",
  },
  colorido: {
    heroTitle: (businessName) => `¡Únete al club ${businessName}!`,
    formTitle: "¿Cómo te llamas?",
    formLead: "Así te saludamos cuando vuelvas.",
    submitLabel: "¡Me apunto!",
    farewell: "¡Vuelve pronto!",
  },
};

// D-057: four tested accent colors per style, taken from the approved design.
// The admin chooses one; button text always comes from buttonTextColor().
export const customerThemePalettes: Record<CustomerTheme, readonly [string, string, string, string]> = {
  elegante: ["#C9A45C", "#1E2A3A", "#B28B42", "#9C7B3E"],
  calido: ["#C8412A", "#E59A55", "#3B2316", "#8A6A55"],
  moderno: ["#FF6A2B", "#FFD23F", "#2EC4B6", "#FF6F9E"],
  colorido: ["#3A1240", "#FF6F9E", "#2EC4B6", "#FFD23F"],
};

export const customerThemePaletteNames: Record<string, string> = {
  "#C9A45C": "Dorado", "#1E2A3A": "Azul noche", "#B28B42": "Bronce", "#9C7B3E": "Oro viejo",
  "#C8412A": "Achiote", "#E59A55": "Caramelo", "#3B2316": "Café tostado", "#8A6A55": "Canela",
  "#FF6A2B": "Naranja", "#FFD23F": "Amarillo", "#2EC4B6": "Turquesa", "#FF6F9E": "Rosa", "#3A1240": "Uva",
};

export function isPaletteColor(theme: CustomerTheme, color: string): boolean {
  return customerThemePalettes[theme].includes(color.toUpperCase());
}

type Rgb = readonly [number, number, number];

// Fixed colors of each style. `veil` darkens the hero photo; its lightest
// stop (`veilMinAlpha`) is what the contrast tests use as the worst case.
export const customerStyleTokens: Record<CustomerTheme, {
  veil: Rgb; veilMinAlpha: number; heroInk: string; mottoInk: string; ornament: string;
  paper: string; paperInk: string; paperMuted: string; paperField: string; paperLine: string;
  confirmationBackground: string; confirmationInk: string; confirmationMuted: string; card: string;
}> = {
  elegante: {
    veil: [10, 8, 6], veilMinAlpha: 0.64, heroInk: "#FBF7EE", mottoInk: "#F3E3BE", ornament: "#C9A45C",
    paper: "#FAF6EE", paperInk: "#1E1A14", paperMuted: "#6B6050", paperField: "#FFFDF8", paperLine: "#9C8A66",
    confirmationBackground: "#FAF6EE", confirmationInk: "#1E1A14", confirmationMuted: "#6B6050", card: "#F1E8D6",
  },
  calido: {
    veil: [48, 24, 10], veilMinAlpha: 0.68, heroInk: "#FFF8EF", mottoInk: "#FDEBD3", ornament: "#F2C48D",
    paper: "#FFF6EA", paperInk: "#3B2316", paperMuted: "#7A5844", paperField: "#FFFCF6", paperLine: "#B08660",
    confirmationBackground: "#F7E6D0", confirmationInk: "#3B2316", confirmationMuted: "#6F4F3B", card: "#FFF6EA",
  },
  moderno: {
    veil: [10, 10, 12], veilMinAlpha: 0.64, heroInk: "#F5F5F7", mottoInk: "#F5F5F7", ornament: "#FF6A2B",
    paper: "#0E0E10", paperInk: "#F5F5F7", paperMuted: "#A6A6AF", paperField: "#17171B", paperLine: "#6E6E78",
    confirmationBackground: "#0E0E10", confirmationInk: "#F5F5F7", confirmationMuted: "#A6A6AF", card: "#17171B",
  },
  colorido: {
    veil: [58, 18, 64], veilMinAlpha: 0.66, heroInk: "#FFFFFF", mottoInk: "#3A1240", ornament: "#FF6F9E",
    paper: "#FFF4F8", paperInk: "#3A1240", paperMuted: "#6E4F68", paperField: "#FFFFFF", paperLine: "#C2668E",
    confirmationBackground: "#FFD23F", confirmationInk: "#3A1240", confirmationMuted: "#5E3F58", card: "#FFFFFF",
  },
};

export function veilGradient(theme: CustomerTheme): string {
  const { veil, veilMinAlpha } = customerStyleTokens[theme];
  const rgba = (alpha: number) => `rgba(${veil.join(",")},${alpha})`;
  return `linear-gradient(180deg, ${rgba(veilMinAlpha)} 0%, ${rgba(Math.min(veilMinAlpha + 0.08, 1))} 55%, ${rgba(0.94)} 100%)`;
}

// Worst case for text on the hero: a pure white photo pixel under the
// lightest stop of the veil.
export function worstCaseHeroBackground(theme: CustomerTheme): string {
  const { veil, veilMinAlpha } = customerStyleTokens[theme];
  const channel = (value: number) => Math.round(255 * (1 - veilMinAlpha) + value * veilMinAlpha);
  return `#${veil.map((value) => channel(value).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

// Accent used for non-text marks (icons, rule, stars). Falls back to a fixed
// style color when the accent would not reach 3:1 against its background.
export function visibleAccent(accent: string, background: string, fallback: string): string {
  return contrastRatio(accent, background) >= 3 ? accent : fallback;
}

// Decorative hero marks use the accent when it stands out from the dark
// veil, otherwise the style's own ornament color.
export function heroOrnament(theme: CustomerTheme, accent: string): string {
  const { veil, ornament } = customerStyleTokens[theme];
  const veilHex = `#${veil.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  return visibleAccent(accent, veilHex, ornament);
}

export const maxVisitStars = 5;

export function filledVisitStars(visitCount: number): number {
  if (!Number.isFinite(visitCount) || visitCount < 0) return 0;
  return Math.min(Math.floor(visitCount), maxVisitStars);
}

export function visitCountLabel(visitCount: number): string {
  return `Esta es tu visita número ${Math.floor(visitCount)}`;
}

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
