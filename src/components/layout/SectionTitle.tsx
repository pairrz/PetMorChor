import Link from "next/link";

type SectionTitleProps = {
  title: string;
  subtitle?: string;
  href?: string;
};

export function SectionTitle({
  title,
  subtitle,
  href,
}: SectionTitleProps) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>

        {subtitle && <p>{subtitle}</p>}
      </div>

      {href && (
        <Link href={href}>
          ดูทั้งหมด →
        </Link>
      )}
    </div>
  );
}