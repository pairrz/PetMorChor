import { PageFrame } from "@/components/layout/PageFrame";
import PetMap from "@/components/map/petmapclient";
import { getAdminUser } from "@/lib/admin";

export default async function DiscoverPage() {
  const admin = await getAdminUser();

  return (
    <PageFrame
      className="page-frame--discover"
      title="ค้นหาใกล้ฉัน"
      subtitle="ค้นหาสถานที่อำนวยความสะดวกเกี่ยวกับสัตว์เลี้ยงรอบมหาวิทยาลัย"
      eyebrow="พื้นที่ของคุณ"
    >
      <PetMap isAdmin={Boolean(admin)} />
    </PageFrame>
  );
}