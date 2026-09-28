import { PageFrame } from "@/components/layout/PageFrame";
import PetMap from "@/components/map/petmapclient";

export default function DiscoverPage() {
  return (
    <PageFrame
      title="ค้นหาใกล้ฉัน"
      subtitle="ค้นหาสถานที่อำนวยความสะดวกเกี่ยวกับสัตว์เลี้ยงรอบมหาวิทยาลัย"
      eyebrow="พื้นที่ของคุณ"
    >
      <PetMap />
    </PageFrame>
  );
}