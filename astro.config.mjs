import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  security: {
    checkOrigin: true,
    // Render terminates TLS and forwards plain HTTP with X-Forwarded-Proto/Host.
    // Astro only trusts those headers for the hosts listed here; without it every
    // form POST fails the origin check with 403 in production.
    allowedDomains: [
      { hostname: "smarttap.yourbizupgraded.com", protocol: "https" },
    ],
  },
});
