import { normalizeHexColor } from "./color";

// Wires the brand color field: color picker, hex text box and optional
// suggested-color buttons ([data-color]) all edit the same value.
export function initBrandColorField(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-brand-color-field]").forEach((field) => {
    const picker = field.querySelector<HTMLInputElement>("[data-color-picker]");
    const text = field.querySelector<HTMLInputElement>("[data-color-text]");
    if (!picker || !text) return;
    const apply = (color: string) => {
      text.value = color;
      picker.value = color.toLowerCase();
    };
    picker.addEventListener("input", () => apply(picker.value.toUpperCase()));
    text.addEventListener("input", () => {
      const color = normalizeHexColor(text.value);
      if (color) picker.value = color.toLowerCase();
    });
    text.addEventListener("blur", () => {
      const color = normalizeHexColor(text.value);
      if (color) apply(color);
    });
    field.querySelectorAll<HTMLButtonElement>("[data-color]").forEach((button) => {
      button.addEventListener("click", () => apply(button.dataset.color ?? ""));
    });
  });
}
