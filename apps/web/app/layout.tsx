import type { Metadata } from "next";
import "./globals.css";
import { GlobalAssistant } from "../components/global-assistant";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://heptacore.vercel.app"),
  title: "HeptaCore | Inteligencia multidimensional + gestion de RRSS",
  description:
    "Sistema AI de marketing 24/7 para estrategia, RRSS, contenido, respuestas, campañas, leads y reporting por cliente.",
  icons: {
    icon: [{ url: "/brand/favicon-32x32.png", type: "image/png" }],
    apple: "/brand/apple-touch-icon.png",
  },
  openGraph: {
    title: "HeptaCore",
    description:
      "Sistema AI de marketing 24/7 para estrategia, RRSS, contenido, respuestas, campañas, leads y reporting por cliente.",
    images: [{ url: "/brand/og-image-1200x630.png", width: 1200, height: 630, alt: "HeptaCore" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HeptaCore",
    description:
      "Sistema AI de marketing 24/7 para estrategia, RRSS, contenido, respuestas, campañas, leads y reporting por cliente.",
    images: ["/brand/og-image-1200x630.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <GlobalAssistant />
      </body>
    </html>
  );
}
