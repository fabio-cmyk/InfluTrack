import type { Metadata, Viewport } from "next";
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
  openGraph: {
    title: "InfluTrack — Rastreamento de Influencers",
    description:
      "Rastreie o ROI real dos seus influencers. Campanhas, vendas e lucro em um so lugar.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F97316" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a2e" },
  ],
  width: "device-width",
  initialScale: 1,
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
