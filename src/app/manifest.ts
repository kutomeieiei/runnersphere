import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RunSphere — เดิน เก็บเหรียญ เลี้ยงสัตว์",
    short_name: "RunSphere",
    description: "เดินไปยังจุดภารกิจในโรงเรียน เก็บเหรียญ แล้วนำไปเลี้ยงสัตว์เลี้ยง (ต้นแบบ)",
    lang: "th",
    start_url: "/play",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff7f2",
    theme_color: "#d23a0b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
