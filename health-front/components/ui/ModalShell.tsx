"use client";

import { Card } from "@/components/ui/Card";
import { useEscapeKey } from "@/lib/useEscapeKey";

export type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Tailwind max-width on the inner scroll container (default: wide admin forms). */
  maxWidthClass?: string;
  /** Extra controls before the close button (e.g. “Full preview”). */
  headerTrailing?: React.ReactNode;
};

/** Form/content modals at z-[70]; ConfirmModal uses z-[80] so confirms stack above. */
export function ModalShell({
  open,
  onClose,
  titleId,
  title,
  subtitle,
  children,
  maxWidthClass = "max-w-4xl",
  headerTrailing,
}: ModalShellProps) {
  useEscapeKey(onClose, open);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full ${maxWidthClass} overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2
                id={titleId}
                className="text-lg font-semibold tracking-tight text-[var(--text-primary)]"
              >
                {title}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {headerTrailing}
              <button
                type="button"
                aria-label="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                onClick={onClose}
              >
                ×
              </button>
            </div>
          </div>
          {children}
        </Card>
      </div>
    </div>
  );
}
