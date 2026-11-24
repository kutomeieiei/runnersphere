import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // หมายเหตุ: ปิด cacheComponents / partialPrefetching ไว้ เพราะหน้าเกมทั้งหมดอยู่หลังการล็อกอิน
  // ฝั่ง client และดึงข้อมูลผ่าน API (ไม่มีส่วนที่ได้ประโยชน์จาก static shell)
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
