import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { getAdminUser } from "@/lib/admin";
import { InformationLibrary } from "./InformationLibrary";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function InformationPage() {
  const [categories, user] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        articles: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    getAdminUser(),
  ]);

  const visibleCategories = categories.filter((category) => category.articles.length > 0);

  return (
    <SiteShell>
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>คลังความรู้ PETMORCHOR</span>
            <h1>ดูแลเพื่อนตัวโปรด<br />ให้มีความสุขในทุกวัน</h1>
            <p>รวมคำแนะนำเรื่องการดูแล โภชนาการ และสุขภาพสัตว์เลี้ยง อ่านง่าย นำไปใช้ได้จริง</p>
            {user && (
              <Link className={styles.manageButton} href="/admin/articles">
                จัดการบทความ
              </Link>
            )}
          </div>
          <div className={styles.heroNote} aria-hidden="true">
            <span>🐾</span>
            <strong>ความรู้ดี ๆ<br />เพื่อเพื่อนสี่ขา</strong>
            <i />
          </div>
        </header>

        <InformationLibrary
          categories={visibleCategories.map((category) => ({
            id: category.id,
            name: category.name,
            articles: category.articles.map((article) => ({
              id: article.id,
              title: article.title,
              content: article.content,
              speciesTag: article.speciesTag,
              createdAt: article.createdAt.toISOString(),
            })),
          }))}
        />
      </main>
    </SiteShell>
  );
}