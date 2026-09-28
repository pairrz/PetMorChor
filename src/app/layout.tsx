import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pet MorChor",
  description: "คอมมูนิตี้คนรักสัตว์เลี้ยงละแวก มช.",
  title: "PetMorChor — ชุมชนคนรักสัตว์",
  description:
    "ค้นหาสัตว์เลี้ยงและคนรักสัตว์ใกล้คุณกับ PetMorChor ชุมชนสำหรับคนรักสัตว์",
  generator: "PetMorChor",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <ReactQueryProvider>
          {children}
        </ReactQueryProvider>
      </body>
    <html lang="th">
      <body className="antialiased">{children}</body>
    </html>
  );
}