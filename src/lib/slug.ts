// Turns a business name into a short URL slug: "Arepas del Niño" -> "arepas-del-nino".
// The result always matches the server rule /^[a-z0-9]+(?:-[a-z0-9]+)*$/ (80 chars max).
export function slugify(value: string): string {
  return value
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}
