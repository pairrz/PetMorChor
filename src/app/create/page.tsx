import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import styles from "./page.module.css";

export default function CreatePage() {
  return (
    <SiteShell>
      <main className={styles.page}>
        <header className={styles.heading}>
          <span className={styles.eyebrow}>PETMORCHOR · มหาวิทยาลัยเชียงใหม่</span>
          <h1>สร้างประกาศสัตว์เลี้ยง</h1>
          <p>ลงประกาศหาบ้านหรือแบ่งปันข้อมูลสัตว์เลี้ยงกับชุมชน</p>
        </header>

        <div className={styles.options}>
          <Link
            href="/marketplace/create"
            className={`${styles.card} ${styles.purple}`}
          >
            <span className={styles.icon} aria-hidden="true">🐾</span>
            <h2>ประกาศสัตว์เลี้ยง</h2>
            <p>เริ่มลงประกาศเพื่อให้น้อง ๆ ได้พบกับคนที่เหมาะสม</p>
            <span className={styles.action}>
              เริ่มลงประกาศ <span aria-hidden="true">→</span>
            </span>
          </Link>
          <Link
            href="/community/create"
            className={`${styles.card} ${styles.purple}`}
          >
            <span className={styles.icon} aria-hidden="true">💬</span>
            <h2>สร้างโพสต์ชุมชน</h2>
            <p>แบ่งปันเรื่องราวหรือขอความช่วยเหลือจากชุมชนคนรักสัตว์</p>
            <span className={styles.action}>
              ไปที่ชุมชน <span aria-hidden="true">→</span>
            </span>
          </Link> 
        </div>

        <Link href="/" className={styles.back}>
          ← กลับหน้าหลัก
        </Link>
      </main>
    </SiteShell>
  );
}