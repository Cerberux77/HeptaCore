import type { Metadata } from "next";
import "./globals.css";
import { GlobalAssistant } from "../components/global-assistant";

export const metadata: Metadata = {
  title: "HeptaCore | Inteligencia multidimensional + gestion de RRSS",
  description:
    "Sistema AI de marketing 24/7 para estrategia, RRSS, contenido, respuestas, campanas, leads y reporting por cliente."
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
