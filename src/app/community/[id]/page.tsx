import { notFound } from "next/navigation";

import { CommunityFeed } from "@/components/community/CommunityFeed";
import { SiteShell } from "@/components/layout/SiteShell";
import { prisma } from "@/lib/prisma";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function CommunityPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);

  if (!Number.isInteger(postId) || postId <= 0) {
    notFound();
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: { select: { id: true, name: true } },
      media: {
        select: { id: true, mediaUrl: true, mediaType: true },
        orderBy: { order: "asc" },
      },
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });

  if (!post) {
    notFound();
  }

  return (
    <SiteShell>
      <main className={styles.page}>
        <header className={styles.heading}>
          <span className={styles.eyebrow}>PETMORCHOR COMMUNITY</span>
          <h1>รายละเอียดโพสต์</h1>
          <p>เรื่องราวและความคิดเห็นจากชุมชนคนรักสัตว์</p>
        </header>
        <CommunityFeed
          posts={[
            {
              ...post,
              createdAt: post.createdAt.toISOString(),
              isLiked: false,
            },
          ]}
        />
      </main>
    </SiteShell>
  );
}
