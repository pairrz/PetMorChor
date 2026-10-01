import { prisma } from "@/lib/prisma";
import { SiteShell } from "@/components/layout/SiteShell";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function InformationPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      articles: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const hasArticles = categories.some((category) => category.articles.length > 0);

  return (
    <SiteShell>
      <main className={styles.page}>
        <header className={styles.heading}>
          <span className={styles.eyebrow}>PETMORCHOR INFORMATION</span>
          <h1>ความรู้เรื่องสัตว์เลี้ยง</h1>
          <p>บทความและคำแนะนำสำหรับดูแลสัตว์เลี้ยง จากชุมชน PetMorChor</p>
        </header>

        {!hasArticles ? (
          <section className={styles.empty}>
            <span aria-hidden="true">📚</span>
            <h2>ยังไม่มีบทความ</h2>
            <p>บทความจะแสดงที่นี่เมื่อมีการเพิ่มข้อมูล</p>
          </section>
        ) : (
          <div className={styles.categories}>
            {categories.map((category) => {
              if (category.articles.length === 0) return null;

              return (
                <section className={styles.category} key={category.id}>
                  <h2>{category.name}</h2>

                  <div className={styles.articles}>
                    {category.articles.map((article) => (
                      <article className={styles.article} key={article.id}>
                        <div className={styles.articleMeta}>
                          <span>{category.name}</span>
                          <span>{article.speciesTag}</span>
                        </div>

                        <h3>{article.title}</h3>
                        <p className={styles.content}>{article.content}</p>

                        <time dateTime={article.createdAt.toISOString()}>
                          {article.createdAt.toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </time>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </SiteShell>
  );
}