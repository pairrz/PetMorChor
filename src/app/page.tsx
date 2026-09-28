import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Hero,
  SectionTitle,
  PetGrid,
  PostCards,
  ServiceCards,
  ArticleCards,
  SiteShell,
} from "@/components/site-shell";

// กำหนด Revalidate ทุก 60 วินาที (ISR ตามบทเรียน Meta-frameworks)
export const revalidate = 60;

export default async function Home() {
  // ดึงข้อมูลจริงจาก Database บน Server โดยตรง (Zero Client JS)
  const [listings, posts, places, articles] = await Promise.all([
    // 1. สัตว์เลี้ยงเปิดหาบ้าน/ขายล่าสุด 4 รายการ
    prisma.listing.findMany({
      take: 4,
      where: { status: "AVAILABLE" },
      orderBy: { createdAt: "desc" },
      include: { media: true },
    }),
    // 2. โพสต์ชุมชนอวดสัตว์/สัตว์หาย 4 รายการ
    prisma.post.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } }, media: true },
    }),
    // 3. รพ./คลินิกสัตว์ใกล้ มช.
    prisma.place.findMany({
      take: 4,
      include: { placeType: true },
    }),
    // 4. บทความเกร็ดความรู้
    prisma.article.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <SiteShell>
      <Hero />

      {/* สัตว์เลี้ยงใกล้คุณ */}
      <section className="section">
        <SectionTitle
          title="สัตว์เลี้ยงใกล้คุณ"
          subtitle="น้อง ๆ และประกาศจากรอบมหาวิทยาลัย"
          href="/marketplace"
        />
        {/* ส่งข้อมูลจริงจาก Database ไปแสดงผล */}
        <PetGrid items={listings} />
      </section>

      {/* แถบแจ้งเตือนชุมชน */}
      <section className="community-strip">
        <div>
          <SectionTitle
            title="มีอะไรเกิดขึ้นแถวนี้บ้าง?"
            subtitle="ถามเรื่องสัตว์หาย แชร์ข่าวสาร หรือช่วยน้อง ๆ ให้เจอบ้านที่อบอุ่น"
            href="/community"
          />
        </div>

        {/* Visitor กดได้ แต่จะโดน Middleware ดัก Redirect ไปหน้า Login */}
        <Link className="dark-cta" href="/create">
          สร้างโพสต์ →
        </Link>
      </section>

      {/* ชุมชนรอบ มช. */}
      <section className="section">
        <SectionTitle
          title="ชุมชนรอบมหาวิทยาลัย"
          subtitle="เรื่องราวและผู้คนในพื้นที่ใกล้เคียง"
          href="/community"
        />
        <PostCards items={posts} />
      </section>

      {/* บริการ/คลินิกใกล้ฉัน */}
      <section className="section">
        <SectionTitle
          title="บริการใกล้ฉัน"
          subtitle="สถานที่ดูแลสัตว์เลี้ยงใกล้มหาวิทยาลัย"
          href="/discover"
        />
        <ServiceCards items={places} />
      </section>

      {/* บทความเกร็ดความรู้ */}
      <section className="section">
        <SectionTitle
          title="ดูแลน้อง ๆ ไปด้วยกัน"
          subtitle="เคล็ดลับสำหรับคนเลี้ยงสัตว์ในพื้นที่"
          href="/information"
        />
        <ArticleCards items={articles} />
      </section>
    </SiteShell>
  );
}