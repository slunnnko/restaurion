import type { Metadata, Viewport } from "next";
import { Lato, Libre_Baskerville } from "next/font/google";
import "./globals.css";

const lato = Lato({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-libre-baskerville",
});

export const metadata: Metadata = {
  title: "Restaurion | Platforma pro památková řemesla",
  description:
    "Profesní síť propojující licencované restaurátory s povolením MK ČR a umělecká řemesla. Zakázky, subdodávky a legální spolupráce na kulturních památkách.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#140e0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={`h-full antialiased ${lato.variable} ${libreBaskerville.variable}`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
