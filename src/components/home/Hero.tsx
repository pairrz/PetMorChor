import Link from "next/link";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.content}>
          <span className={styles.eyebrow}>🐾 PET COMMUNITY</span>

          <h1 className={styles.title}>
            น้อง ๆ สัตว์เลี้ยงใน
            <br />
            <span>รอบมช</span>
            กำลังหาบ้านอยู่น้า
          </h1>

          <p className={styles.description}>
            ค้นหาสัตว์เลี้ยง หรือ ประกาศหาบ้าน ให้น้อง
          </p>

          <div className={styles.actions}>
            <Link className={styles.primaryCta} href="/marketplace">
              ดูสัตว์เลี้ยง <span aria-hidden="true">→</span>
            </Link>

          </div>
        </div>

        <div className={styles.visual} aria-hidden="true">
          <div className={styles.paw}>🐾</div>
          <div className={styles.note}>
            <span>พื้นที่ของเรา</span>
            <strong>เริ่มต้นจากความห่วงใย</strong>
            <span>แบ่งปันเรื่องราวดี ๆ ให้เพื่อนรักสัตว์</span>
          </div>
          <div className={styles.tag}>ชุมชนคนรักสัตว์</div>
        </div>
      </div>
    </section>
  );
}