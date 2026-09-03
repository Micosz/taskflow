import type { MetadataRoute } from "next";

import { translations } from "@/i18n/translations";

export default function manifest(): MetadataRoute.Manifest {
  const defaultMessages = translations.en;

  return {
    id: "/",
    name: `${defaultMessages.app.name} — ${defaultMessages.app.tagline}`,
    short_name: defaultMessages.app.shortName,
    description: defaultMessages.app.productDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#080916",
    theme_color: "#080916",
    categories: ["productivity", "education"],
    icons: [
      {
        src: "/icons/taskflow-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/taskflow-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/taskflow-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
