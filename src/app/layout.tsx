import type { Metadata, Viewport } from "next";
import { Prompt } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Movemai", template: "%s · Movemai" },
  description: "เดินไปยังจุดภารกิจในโรงเรียน เก็บเหรียญ แล้วเลี้ยงสัตว์เลี้ยงของคุณ (ต้นแบบเพื่อการทดลอง)",
  applicationName: "Movemai",
  appleWebApp: { capable: true, title: "Movemai", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#d23a0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${prompt.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
