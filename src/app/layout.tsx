import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import { SocketProvider } from "@/context/SocketContext";
import { getSessionUser } from "@/lib/auth-guard";
import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ดึง session ของผู้ใช้ที่ล็อกอินอยู่
  const user = await getSessionUser();

  return (
    <html lang="th">
      <body className="antialiased">
        <ReactQueryProvider>
          <SocketProvider userId={user?.id}>
            {children}
          </SocketProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}