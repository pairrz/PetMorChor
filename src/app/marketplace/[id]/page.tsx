import { notFound } from "next/navigation";

import { PageFrame } from "@/components/layout/PageFrame";
import { AnimalDetail } from "@/components/marketplace/AnimalDetail";
import { pets } from "@/lib/pet-data";

export default async function MarketplaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const pet = pets.find((pet) => pet.id === id);

  if (!pet) {
    notFound();
  }

  return (
    <PageFrame
      title="Animal listing"
      eyebrow="PERSONAL LISTING"
    >
      <AnimalDetail pet={pet} />
    </PageFrame>
  );
}