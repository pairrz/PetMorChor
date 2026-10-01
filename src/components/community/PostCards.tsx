import Link from "next/link";

type PostCardsProps = {
  items: any[];
};

export function PostCards({ items }: PostCardsProps) {
  return (
    <div className="post-grid">
      {items.map((post) => (
        <Link
          className="post-card"
          href={`/community/${post.id}`}
          key={post.id}
        >
          <div className="post-user">
            <span className="post-avatar">
              {post.user?.name?.[0] ?? "U"}
            </span>

            <b>{post.user?.name ?? "ผู้ใช้"}</b>

            <span>
              ·{" "}
              {new Date(post.createdAt).toLocaleDateString("th-TH")}
            </span>
          </div>

          <p>{post.caption}</p>

          <div className="post-actions">
            <span>♡ {post.likes?.length ?? 0}</span>
            <span>○ {post.comments?.length ?? 0} comments</span>
            <span>↗ Share</span>
          </div>
        </Link>
      ))}
    </div>
  );
}