import type { Metadata } from "next";
import { Archivo, Geist_Mono, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Panso Nestor Sherald Shrimp Farming Management",
  description: "Shrimp farming guide and management system",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className={`${archivo.className} ${archivo.variable} ${geistMono.variable} antialiased`}
      >
        {/* session=null: SessionProvider fetches session client-side via /api/auth/session.
            Calling auth() here fired on every page load and crashed on stale cookies — 
            individual route layouts handle auth protection instead. */}
        <Providers session={null}>{children}</Providers>
      </body>
    </html>
  );
}
