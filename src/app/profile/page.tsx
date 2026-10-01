import Link from "next/link";

import { PageFrame } from "@/components/layout/PageFrame";
import { getCurrentUser } from "@/lib/session";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <PageFrame
      title="โปรไฟล์ของฉัน"
      subtitle="จัดการข้อมูลโปรไฟล์และสัตว์เลี้ยงของคุณ"
      eyebrow="PROFILE"
    >
      {user ? (
        <section className={styles.card}>
          <div className={styles.avatar} aria-hidden="true">
            {(user.name || user.email || "ผู้ใช้")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className={styles.details}>
            <h2>{user.name || "ยังไม่ได้ตั้งชื่อ"}</h2>

            <p>{user.email}</p>

            <span className={styles.role}>
              {user.role}
            </span>

            <p>
              สมาชิกตั้งแต่{" "}
              {new Date(user.createdAt).toLocaleDateString("th-TH")}
            </p>
          </div>
        </section>
      ) : (
        <section className={styles.loginPrompt}>
          <div className={styles.promptIcon} aria-hidden="true">
            🐾
          </div>

          <h2>เข้าสู่ระบบเพื่อดูโปรไฟล์</h2>

          <p>
            เข้าสู่ระบบเพื่อจัดการข้อมูลและประกาศสัตว์เลี้ยงของคุณ
          </p>

          <Link className={styles.loginButton} href="/login">
            เข้าสู่ระบบ
          </Link>
        </section>
      )}
    </PageFrame>
  );
}