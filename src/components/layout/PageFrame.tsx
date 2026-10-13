import { SiteShell } from "./SiteShell";
import { Eyebrow } from "./Eyebrow";

export function PageFrame({
  title,
  subtitle,
  children,
  eyebrow = "AROUND CAMPUS",
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <SiteShell>
      <section className={`page-frame${className ? ` ${className}` : ""}`}>
        <Eyebrow>{eyebrow}</Eyebrow>

        <h1>{title}</h1>

        {subtitle && <p className="lead">{subtitle}</p>}

        {children}
      </section>
    </SiteShell>
  );
}