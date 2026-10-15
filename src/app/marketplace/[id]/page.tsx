import { notFound } from "next/navigation";

import { PageFrame } from "@/components/layout/PageFrame";
import { AnimalDetail } from "@/components/marketplace/AnimalDetail";
import { prisma } from "@/lib/prisma";

export default async function MarketplaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listingId = Number(id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    notFound();
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      user: { select: { id: true, name: true } },
      media: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!listing) {
    notFound();
  }

  return (
    <PageFrame
      title="รายละเอียดประกาศ"
      subtitle="ข้อมูลสัตว์เลี้ยงและช่องทางติดต่อผู้ประกาศ"
      eyebrow="PET MARKETPLACE"
    >
      <AnimalDetail
        listing={{
          ...listing,
          price: listing.price.toString(),
          createdAt: listing.createdAt.toISOString(),
        }}
      />
    </PageFrame>
  );
}