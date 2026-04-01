import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InfluTrack — Rastreamento de Influencers",
  description:
    "Rastreie e acompanhe o resultado de influencers para sua marca D2C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
