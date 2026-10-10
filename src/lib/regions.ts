import { getCountries } from "libphonenumber-js";

export type SelectOption = { value: string; label: string };

// Common time zones for Smart Tap customers, named the way people say them.
// Any valid IANA zone is still accepted by the server; a zone already stored
// for a business that is not in this list is added by timezoneOptions().
const commonTimezones: readonly SelectOption[] = [
  { value: "America/New_York", label: "Este (Florida, Nueva York)" },
  { value: "America/Chicago", label: "Centro (Texas, Chicago)" },
  { value: "America/Denver", label: "Montaña (Denver)" },
  { value: "America/Phoenix", label: "Arizona" },
  { value: "America/Los_Angeles", label: "Pacífico (California)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawái" },
  { value: "America/Puerto_Rico", label: "Puerto Rico" },
  { value: "America/Santo_Domingo", label: "República Dominicana" },
  { value: "America/Caracas", label: "Venezuela" },
  { value: "America/Bogota", label: "Colombia" },
  { value: "America/Mexico_City", label: "México (centro)" },
  { value: "America/Panama", label: "Panamá" },
  { value: "America/Lima", label: "Perú" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina" },
  { value: "America/Santiago", label: "Chile" },
  { value: "Europe/Madrid", label: "España" },
];

export function timezoneOptions(current?: string | null): SelectOption[] {
  const options = [...commonTimezones];
  if (current && !options.some((option) => option.value === current)) options.push({ value: current, label: current });
  return options;
}

// Every country libphonenumber-js can parse, named in Spanish, United States first.
export function countryOptions(): SelectOption[] {
  const names = new Intl.DisplayNames(["es"], { type: "region" });
  const options = getCountries().map((code) => {
    let label: string = code;
    try { label = names.of(code) ?? code; } catch { /* keep the code */ }
    return { value: code as string, label };
  });
  options.sort((first, second) => first.label.localeCompare(second.label, "es"));
  const unitedStates = options.findIndex((option) => option.value === "US");
  if (unitedStates > 0) options.unshift(...options.splice(unitedStates, 1));
  return options;
}
