import type { ReactNode } from "react";

export type CardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
};

export function Card({ title, description, children }: CardProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      {title ? (
        <header className="mb-6 flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

