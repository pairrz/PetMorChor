import { SiteShell } from "@/components/layout/SiteShell";
import { Hero } from "@/components/home/Hero";
import { BannerPromote } from "@/components/home/BannerPromote";
import { CommunityPromo } from "@/components/home/PromoContest";

export default function Home() {
  return (
    <SiteShell>
      <BannerPromote />
      <Hero />
      <CommunityPromo />
    </SiteShell>
  );
}