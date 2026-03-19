import type { ReactNode } from "react";

export type CardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
};

export function Card({ title, description, children }: CardProps) {
  return (
    <section className="surface-card p-6">
      {title ? (
        <header className="mb-6 flex flex-col gap-1 border-b border-[var(--border)] pb-4">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-[var(--text-secondary)]">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

