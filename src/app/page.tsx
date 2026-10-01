import Link from "next/link";
import { prisma } from "@/lib/prisma";

import { SiteShell } from "@/components/layout/SiteShell";
import { Hero } from "@/components/home/Hero";
import { SectionTitle } from "@/components/layout/SectionTitle";
import { PetGrid } from "@/components/marketplace/PetGrid";
import { PostCards } from "@/components/community/PostCards";
import { ServiceCards } from "@/components/discover/ServiceCards";
import { ArticleCards } from "@/components/information/ArticleCards";
import { BannerPromote } from "@/components/home/BannerPromote";
import { CommunityPromo } from "@/components/home/PromoContest";

export const dynamic = "force-dynamic";

export default async function Home() {
  // ดึงข้อมูลจริงจาก Database บน Server โดยตรง (Zero Client JS)
  const [listings, posts, places, articles] = await Promise.all([
    // 1. สัตว์เลี้ยงเปิดหาบ้าน/ขายล่าสุด 4 รายการ
    prisma.listing.findMany({
      take: 4,
      where: { status: "AVAILABLE" },
      orderBy: { createdAt: "desc" },
      include: { media: true },
    }),
    // 2. โพสต์ชุมชนอวดสัตว์/สัตว์หาย 4 รายการ
    prisma.post.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } }, media: true },
    }),
    // 3. รพ./คลินิกสัตว์ใกล้ มช.
    prisma.place.findMany({
      take: 4,
      include: { placeType: true },
    }),
    // 4. บทความเกร็ดความรู้
    prisma.article.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <SiteShell>
      <BannerPromote />
      <Hero />
      <CommunityPromo />

      
      
    </SiteShell>
  );
}