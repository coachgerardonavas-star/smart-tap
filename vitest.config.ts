import { defineConfig } from "vitest/config";

// The React island is rendered with react-dom/server in tests (D-057).
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
});
