import { prisma } from "@/lib/prisma";
import { SiteShell } from "@/components/layout/SiteShell";
import styles from "./page.module.css";

const categoryLabels: Record<string, string> = {
  GENERAL: "ชุมชน",
  LOST_PET: "สัตว์เลี้ยงหาย",
  ADOPTION: "หาบ้าน",
};

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const posts = await prisma.post.findMany({
    orderBy: [
      { isPinned: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    include: {
      user: { select: { name: true } },
      media: { orderBy: { createdAt: "asc" } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return (
    <SiteShell>
      <main className={styles.page}>
        <header className={styles.heading}>
          <span className={styles.eyebrow}>PETMORCHOR COMMUNITY</span>
          <h1>ชุมชนคนรักสัตว์</h1>
          <p>แบ่งปันเรื่องราว อัปเดตข่าว และช่วยเหลือสัตว์เลี้ยงในชุมชน มช.</p>
        </header>

        {posts.length === 0 ? (
          <div className={styles.empty}>
            <span aria-hidden="true">🐾</span>
            <h2>ยังไม่มีโพสต์ในชุมชน</h2>
            <p>เมื่อมีสมาชิกแบ่งปันเรื่องราว โพสต์จะแสดงที่หน้านี้</p>
          </div>
        ) : (
          <section className={styles.feed} aria-label="โพสต์ในชุมชน">
            {posts.map((post) => (
              <article className={styles.post} key={post.id}>
                <header className={styles.postHeader}>
                  <div className={styles.avatar} aria-hidden="true">
                    {post.user.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className={styles.author}>
                    <strong>{post.user.name}</strong>
                    <time dateTime={post.createdAt.toISOString()}>
                      {post.createdAt.toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                  <span className={styles.category}>
                    {categoryLabels[post.category] ?? post.category}
                  </span>
                </header>

                {post.isPinned && (
                  <p className={styles.pinned}>📌 โพสต์ปักหมุด</p>
                )}

                <h2 className={styles.caption}>{post.caption}</h2>
                <p className={styles.description}>{post.description}</p>

                {post.media.length > 0 && (
                  <div className={styles.media}>
                    {post.media.map((item) =>
                      item.mediaType === "VIDEO" ? (
                        <video
                          key={item.id}
                          src={item.mediaUrl}
                          controls
                          preload="metadata"
                        />
                      ) : (
                        <img
                          key={item.id}
                          src={item.mediaUrl}
                          alt={`รูปภาพประกอบโพสต์: ${post.caption}`}
                        />
                      ),
                    )}
                  </div>
                )}

                <footer className={styles.postFooter}>
                  <span>💜 {post._count.likes} ถูกใจ</span>
                  <span>💬 {post._count.comments} ความคิดเห็น</span>
                </footer>
              </article>
            ))}
          </section>
        )}
      </main>
    </SiteShell>
  );
}