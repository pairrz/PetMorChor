"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [items, setItems] = useState(posts);
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [commentText, setCommentText] = useState<Record<number, string>>({});
  const [loadingComments, setLoadingComments] = useState<number | null>(null);
  const [submittingComment, setSubmittingComment] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [openingChatUserId, setOpeningChatUserId] = useState<number | null>(null);
  const [mediaIndexes, setMediaIndexes] = useState<Record<number, number>>({});
  const touchStartX = useRef<number | null>(null);

  function showMedia(postId: number, index: number, mediaCount: number) {
    setMediaIndexes((current) => ({
      ...current,
      [postId]: Math.max(0, Math.min(index, mediaCount - 1)),
    }));
  }

  async function openChat(userId: number) {
    setOpeningChatUserId(userId);
    setError("");
    try {
      const response = await fetch("/api/chats/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.message ?? "ไม่สามารถเปิดห้องแชทได้");
        return;
      }
      router.push(`/chat?roomId=${result.data.id}`);
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบแชทได้");
    } finally {
      setOpeningChatUserId(null);
    }
  }

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
              <button
                type="button"
                className={styles.authorButton}
                onClick={() => void openChat(post.user.id)}
                disabled={openingChatUserId === post.user.id}
                title="กดเพื่อเริ่มแชท"
              >
                {openingChatUserId === post.user.id ? "กำลังเปิดแชท..." : post.user.name}
              </button>
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
            <div
              className={styles.media}
              role="group"
              aria-label={`รูปภาพและวิดีโอในโพสต์: ${post.caption}`}
              onTouchStart={(event) => {
                touchStartX.current = event.changedTouches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                const startX = touchStartX.current;
                const endX = event.changedTouches[0]?.clientX;
                touchStartX.current = null;
                if (startX === null || endX === undefined || post.media.length < 2) return;

                const swipeDistance = endX - startX;
                if (Math.abs(swipeDistance) < 40) return;

                const currentIndex = mediaIndexes[post.id] ?? 0;
                showMedia(
                  post.id,
                  currentIndex + (swipeDistance < 0 ? 1 : -1),
                  post.media.length
                );
              }}
            >
              {(() => {
                const currentIndex = Math.min(
                  mediaIndexes[post.id] ?? 0,
                  post.media.length - 1
                );
                const item = post.media[currentIndex];

                return item.mediaType === "VIDEO" ? (
                  <video
                    key={item.id}
                    className={styles.slide}
                    src={item.mediaUrl}
                    controls
                    preload="metadata"
                  />
                ) : (
                  <img
                    key={item.id}
                    className={styles.slide}
                    src={item.mediaUrl}
                    alt={`รูปภาพ ${currentIndex + 1} จาก ${post.media.length}: ${post.caption}`}
                  />
                );
              })()}

              {post.media.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.mediaButton} ${styles.previousMedia}`}
                    onClick={() =>
                      showMedia(
                        post.id,
                        (mediaIndexes[post.id] ?? 0) - 1,
                        post.media.length
                      )
                    }
                    disabled={(mediaIndexes[post.id] ?? 0) === 0}
                    aria-label="ดูรูปก่อนหน้า"
                  >
                    ‹
                  </button>
                  <span className={styles.mediaCount} aria-live="polite">
                    {Math.min(mediaIndexes[post.id] ?? 0, post.media.length - 1) + 1}
                    {" / "}
                    {post.media.length}
                  </span>
                  <button
                    type="button"
                    className={`${styles.mediaButton} ${styles.nextMedia}`}
                    onClick={() =>
                      showMedia(
                        post.id,
                        (mediaIndexes[post.id] ?? 0) + 1,
                        post.media.length
                      )
                    }
                    disabled={(mediaIndexes[post.id] ?? 0) >= post.media.length - 1}
                    aria-label="ดูรูปถัดไป"
                  >
                    ›
                  </button>
                </>
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
                    <button
                      type="button"
                      className={styles.commentUserButton}
                      onClick={() => void openChat(comment.user.id)}
                      disabled={openingChatUserId === comment.user.id}
                      title="กดเพื่อเริ่มแชท"
                    >
                      {openingChatUserId === comment.user.id
                        ? "กำลังเปิดแชท..."
                        : comment.user.name}
                    </button>{" "}
                    {comment.content}
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
