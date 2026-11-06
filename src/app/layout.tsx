import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Si-Bimbel · Kelola les privat dan bimbel",
  description: "Absensi tentor, kuota paket, tagihan orang tua, dan honor dalam satu aplikasi.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#2F4BD8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="id"><body>{children}</body></html>);
}