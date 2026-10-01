import { notFound } from "next/navigation";

import { PageFrame } from "@/components/layout/PageFrame";
import { AnimalDetail } from "@/components/marketplace/AnimalDetail";

type ListingDetail = {
  id: number;
  title: string;
  description: string;
  species: string;
  price: string | number;
  type: string;
  status: string;
  createdAt: string;
  user: { id: number; name: string };
  media: { id: number; mediaUrl: string; mediaType: string }[];
};

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

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/listings/${listingId}`,
    { cache: "no-store" },
  );

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("ไม่สามารถโหลดรายละเอียดประกาศได้");
  }

  const result: { success: boolean; data: ListingDetail } = await response.json();

  return (
    <PageFrame
      title="Animal listing"
      eyebrow="PERSONAL LISTING"
    >
      <AnimalDetail listing={result.data} />
    </PageFrame>
  );
}