"use client";

import { useState } from "react";

import styles from "@/app/community/page.module.css";

type Post = {
  id: number;
  caption: string;
  description: string;
  category: string;
  isPinned: boolean;
  createdAt: string;
  user: { id: number; name: string };
  media: { id: number; mediaUrl: string; mediaType: string }[];
  _count: { likes: number; comments: number };
  isLiked: boolean;
};

type Comment = {
  id: number;
  content: string;
  createdAt: string;
  user: { id: number; name: string };
};

const categoryLabels: Record<string, string> = {
  GENERAL: "ชุมชน",
  LOST_PET: "สัตว์เลี้ยงหาย",
  ADOPTION: "หาบ้าน",
};

export function CommunityFeed({ posts }: { posts: Post[] }) {
  const [items, setItems] = useState(posts);
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [commentText, setCommentText] = useState<Record<number, string>>({});
  const [loadingComments, setLoadingComments] = useState<number | null>(null);
  const [submittingComment, setSubmittingComment] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function toggleLike(postId: number) {
    setError("");
    const response = await fetch(`/api/posts/${postId}/like`, {
      method: "POST",
      credentials: "include",
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.message ?? "กรุณาเข้าสู่ระบบก่อนกดถูกใจ");
      return;
    }

    setItems((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, isLiked: result.liked, _count: { ...post._count, likes: result.likes } }
          : post,
      ),
    );
  }

  async function toggleComments(postId: number) {
    if (openComments === postId) {
      setOpenComments(null);
      return;
    }

    setOpenComments(postId);
    if (comments[postId]) return;

    setLoadingComments(postId);
    const response = await fetch(`/api/posts/${postId}/comments`, {
      credentials: "include",
    });
    const result = await response.json();
    setLoadingComments(null);

    if (response.ok) {
      setComments((current) => ({ ...current, [postId]: result.data }));
    } else {
      setError(result.message ?? "โหลดคอมเมนต์ไม่สำเร็จ");
    }
  }

  async function submitComment(postId: number) {
    const content = commentText[postId]?.trim();
    if (!content) return;

    setSubmittingComment(postId);
    setError("");
    const response = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    const result = await response.json();
    setSubmittingComment(null);

    if (!response.ok) {
      setError(result.message ?? "เพิ่มคอมเมนต์ไม่สำเร็จ");
      return;
    }

    setComments((current) => ({
      ...current,
      [postId]: [...(current[postId] ?? []), result.data],
    }));
    setCommentText((current) => ({ ...current, [postId]: "" }));
    setItems((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, _count: { ...post._count, comments: post._count.comments + 1 } }
          : post,
      ),
    );
  }

  return (
    <section className={styles.feed} aria-label="โพสต์ในชุมชน">
      {error && <p className={styles.error} role="alert">{error}</p>}

      {items.map((post) => (
        <article className={styles.post} key={post.id}>
          <header className={styles.postHeader}>
            <div className={styles.avatar} aria-hidden="true">
              {post.user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className={styles.author}>
              <strong>{post.user.name}</strong>
              <time dateTime={post.createdAt}>
                {new Date(post.createdAt).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </div>
            <span className={styles.category}>{categoryLabels[post.category] ?? post.category}</span>
          </header>

          {post.isPinned && <p className={styles.pinned}>📌 โพสต์ปักหมุด</p>}
          <h2 className={styles.caption}>{post.caption}</h2>
          <p className={styles.description}>{post.description}</p>

          {post.media.length > 0 && (
            <div className={styles.media}>
              {post.media.map((item) =>
                item.mediaType === "VIDEO" ? (
                  <video key={item.id} src={item.mediaUrl} controls preload="metadata" />
                ) : (
                  <img key={item.id} src={item.mediaUrl} alt={`รูปภาพประกอบโพสต์: ${post.caption}`} />
                ),
              )}
            </div>
          )}

          <footer className={styles.postFooter}>
            <button type="button" onClick={() => void toggleLike(post.id)} aria-pressed={post.isLiked}>
              {post.isLiked ? "💜" : "♡"} {post._count.likes} ถูกใจ
            </button>
            <button type="button" onClick={() => void toggleComments(post.id)}>
              💬 {post._count.comments} ความคิดเห็น
            </button>
          </footer>

          {openComments === post.id && (
            <div className={styles.comments}>
              {loadingComments === post.id ? (
                <p>กำลังโหลดคอมเมนต์...</p>
              ) : (
                comments[post.id]?.map((comment) => (
                  <p key={comment.id}>
                    <strong>{comment.user.name}</strong> {comment.content}
                  </p>
                ))
              )}
              <div className={styles.commentForm}>
                <input
                  value={commentText[post.id] ?? ""}
                  onChange={(event) => setCommentText((current) => ({ ...current, [post.id]: event.target.value }))}
                  placeholder="เขียนคอมเมนต์..."
                  maxLength={500}
                />
                <button
                  type="button"
                  onClick={() => void submitComment(post.id)}
                  disabled={submittingComment === post.id}
                >
                  ส่ง
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
