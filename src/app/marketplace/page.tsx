import { prisma } from "@/lib/prisma";
import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser";
import { SiteShell } from "@/components/layout/SiteShell";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const listings = await prisma.listing.findMany({
    where: { status: "AVAILABLE" },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true } },
      media: true,
    },
  });

  const serializableListings = listings.map((listing) => ({
    ...listing,
    price: listing.price === null ? null : Number(listing.price),
    createdAt: listing.createdAt.toISOString(),
  }));

  return (
    <SiteShell>
      <MarketplaceBrowser listings={serializableListings} />
    </SiteShell>
  );
}