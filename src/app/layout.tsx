import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Encontre Aqui — Encontre profissionais perto de você",
    template: "%s | Encontre Aqui",
  },
  description:
    "Encontre profissionais qualificados perto de você. Compare avaliações, encontre serviços e contrate com mais segurança.",
  applicationName: "Encontre Aqui",
  manifest: "/manifest.webmanifest",
  keywords: [
    "profissionais perto de mim",
    "eletricista",
    "encanador",
    "diarista",
    "prestador de serviços",
    "contratar serviços",
  ],
  openGraph: {
    title: "Encontre Aqui — Encontre profissionais perto de você",
    description:
      "Encontre profissionais qualificados perto de você. Compare avaliações, encontre serviços e contrate com mais segurança.",
    type: "website",
    locale: "pt_BR",
    siteName: "Encontre Aqui",
  },
};

export const viewport: Viewport = {
  themeColor: "#6d4aff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
