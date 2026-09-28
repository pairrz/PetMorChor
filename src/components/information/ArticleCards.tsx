import Link from "next/link";
import { Eyebrow } from "@/components/layout/Eyebrow";

type ArticleCardsProps = {
  items: any[];
};

export function ArticleCards({ items }: ArticleCardsProps) {
  return (
    <div className="article-grid">
      {items.map((article) => (
        <Link
          className="article-card"
          href={`/information/${article.id}`}
          key={article.id}
        >
          <Eyebrow>
            {article.speciesTag || "CARE"}
          </Eyebrow>

          <h3>{article.title}</h3>

          <p>
            {article.content?.slice(0, 120)}
            {article.content?.length > 120 ? "..." : ""}
          </p>
        </Link>
      ))}
    </div>
  );
}