import Link from "next/link";
import styles from "./PromoContest.module.css";

export function CommunityPromo() {
  return (
    <section className={styles.section}>
      <div className={styles.banner}>
        <div className={styles.content}>
          <span className={styles.eyebrow}>ชุมชนคนรักสัตว์ มช.</span>
          <h2 className={styles.title}>น้องที่บ้านน่ารักแค่ไหน?</h2>
          <p className={styles.description}>
            มาอวดรูปและแบ่งปันเรื่องราวของเพื่อนตัวน้อยกับชุมชนของเรา
          </p>
          <Link className={styles.button} href="/community">
            ไปที่ชุมชน <span aria-hidden="true">→</span>
          </Link>
        </div>
        <span className={styles.decoration} aria-hidden="true">🐶 🐱</span>
      </div>
    </section>
  );
}