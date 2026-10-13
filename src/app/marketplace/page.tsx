import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser";
import { SiteShell } from "@/components/layout/SiteShell";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const listings = await prisma.listing.findMany({
    take: 13,
    where: { status: "AVAILABLE" },
    orderBy: { createdAt: "desc" },
    include: {
      media: true,
      user: { select: { id: true, name: true } },
    },
  });

  let nextCursor: number | null = null;
  if (listings.length > 12) {
    nextCursor = listings.pop()?.id ?? null;
  }

  return (
    <SiteShell>
      <MarketplaceBrowser
        initialListings={listings.map((listing) => ({
          ...listing,
          price: listing.price.toString(),
          createdAt: listing.createdAt.toISOString(),
          updatedAt: listing.updatedAt.toISOString(),
        }))}
        initialCursor={nextCursor}
      />
    </SiteShell>
  );
}