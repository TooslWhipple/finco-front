import type { MetadataRoute } from "next";
import { COLOR_MARCA } from "@/lib/icono-app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finco",
    short_name: "Finco",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: COLOR_MARCA,
    theme_color: COLOR_MARCA,
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
