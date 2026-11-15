import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OPIT Tracker",
    short_name: "OPIT",
    description: "Grades, live sessions, attendance and deadlines for your OPIT degree.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0b10",
    theme_color: "#0a0b10",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", url: "/#today" },
      { name: "Courses", url: "/#courses" },
      { name: "Grades", url: "/#grades" },
      { name: "Plan", url: "/#plan" },
    ],
  }
}
