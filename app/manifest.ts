import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LifeFlow — Your day, planned for you",
    short_name: "LifeFlow",
    description:
      "LifeFlow is an AI-powered daily planner that organizes your entire day automatically and feels like a personal assistant.",
    start_url: "/today",
    display: "standalone",
    background_color: "#0b0b12",
    theme_color: "#4338ca",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
