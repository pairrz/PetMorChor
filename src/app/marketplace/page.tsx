import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser";
import { SiteShell } from "@/components/layout/SiteShell";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/listings?limit=12`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch listings");
  }

  const result = await res.json();

  return (
    <SiteShell>
      <MarketplaceBrowser
        initialListings={result.data}
        initialCursor={result.pagination.nextCursor}
      />
    </SiteShell>
  );
}