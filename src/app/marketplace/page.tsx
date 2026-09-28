import { PageFrame } from "@/components/layout/PageFrame";
import { PetGrid } from "@/components/marketplace/PetGrid";
import { MarketplaceCards } from "@/components/marketplace/MarketplaceCards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function MarketplacePage() {
  const listings = await prisma.listing.findMany({
    where: {
      status: "AVAILABLE",
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      media: true,
    },
  });

  return (
    <PageFrame
      title="ตลาดสัตว์เลี้ยง"
      subtitle="ประกาศหาบ้านและของใช้สัตว์เลี้ยงจากคนในพื้นที่ใกล้เคียง"
      eyebrow="ซื้อและหาบ้าน"
    >
      <MarketplaceCards />

      <PetGrid items={listings} />
    </PageFrame>
  );
}