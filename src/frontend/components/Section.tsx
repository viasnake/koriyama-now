import type { ReactNode } from "react";

type SectionProps = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Section({ title, eyebrow, action, children, className }: SectionProps) {
  return (
    <section className={`section ${className ?? ""}`.trim()}>
      <div className="section__head">
        <div>
          {eyebrow ? <p className="section__eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        {action ? <div className="section__action">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function SectionError({ message }: { message: string }) {
  return (
    <div className="section-error" role="status">
      {message}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export function PageLoader({ label }: { label: string }) {
  return (
    <div className="page-loader" role="status">
      <span className="loader-dot" />
      {label}
    </div>
  );
}
