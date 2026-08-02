import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// Populate BASE_URL when a domain is configured.
const BASE_URL = "";

const paths = [
  "/",
  "/dashboard",
  "/directions",
  "/branches",
  "/groups",
  "/teachers",
  "/students",
  "/support-teachers",
  "/parents",
  "/attendance",
  "/tests",
  "/payments",
  "/notifications",
  "/users",
  "/settings",
  "/profile",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = paths
          .map((p) => `  <url><loc>${BASE_URL}${p}</loc><changefreq>weekly</changefreq></url>`)
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
