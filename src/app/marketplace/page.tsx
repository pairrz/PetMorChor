import {
  PageFrame,
  PetGrid,
  SectionTitle,
  SearchFilters,
  MarketplaceCards,
} from "@/components/site-shell";

export default function MarketplacePage() {
  return (
    <PageFrame
      title="ตลาดสัตว์เลี้ยง"
      subtitle="ประกาศหาบ้านและของใช้สัตว์เลี้ยงจากคนในพื้นที่ใกล้เคียง"
      eyebrow="ซื้อและหาบ้าน"
    >
      <SearchFilters />

      <MarketplaceCards />

      <SectionTitle title="Pets looking for homes" />

      <PetGrid />
    </PageFrame>
  );
}