import Link from "next/link";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <span className="eyebrow">PET COMMUNITY</span>

        <h1>
          พื้นที่สำหรับคนรักสัตว์
          <br />
          รอบมหาวิทยาลัย
        </h1>

        <p>
          ค้นหาสัตว์เลี้ยง ประกาศหาบ้าน
          และพูดคุยกับคนรักสัตว์ในพื้นที่เดียวกัน
        </p>

        <div className="hero-actions">
          <Link className="primary-cta" href="/marketplace">
            ดูสัตว์เลี้ยง
          </Link>

          <Link className="secondary-cta" href="/community">
            เข้าสู่ชุมชน
          </Link>
        </div>
      </div>
    </section>
  );
}