import { headers } from "next/headers";

import { SiteShell } from "@/components/layout/SiteShell";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import styles from "./page.module.css";

type Post = {
  id: number;
  caption: string;
  description: string;
  category: string;
  isPinned: boolean;
  createdAt: string;

  user: {
    id: number;
    name: string;
    image: string | null;
  };

  media: {
    id: number;
    mediaUrl: string;
    mediaType: string;
  }[];

  _count: {
    likes: number;
    comments: number;
  };

  isLiked: boolean;
};

type PostsResponse = {
  success: boolean;
  data: Post[];
  pagination: {
    nextCursor: string | null;
  };
};

async function getPosts(): Promise<PostsResponse> {
  const requestHeaders = await headers();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/posts`,
    {
      cache: "no-store",
      headers: {
        cookie: requestHeaders.get("cookie") ?? "",
      },
    }
  );

  if (!response.ok) {
    throw new Error("ไม่สามารถโหลดโพสต์ได้");
  }

  return response.json();
}

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const result = await getPosts();

  const posts = result.success ? result.data : [];

  return (
    <SiteShell>
      <main className={styles.page}>
        <header className={styles.heading}>
          <span className={styles.eyebrow}>
            PETMORCHOR COMMUNITY
          </span>

          <h1>ชุมชนคนรักสัตว์</h1>

          <p>
            แบ่งปันเรื่องราว อัปเดตข่าว
            และช่วยเหลือสัตว์เลี้ยงในชุมชน มช.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className={styles.empty}>
            <span aria-hidden="true">🐾</span>

            <h2>ยังไม่มีโพสต์ในชุมชน</h2>

            <p>
              เมื่อมีสมาชิกแบ่งปันเรื่องราว
              โพสต์จะแสดงที่หน้านี้
            </p>
          </div>
        ) : <CommunityFeed posts={posts} />}
      </main>
    </SiteShell>
  );
}