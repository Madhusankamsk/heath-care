"use client";

import { Card } from "@/components/ui/Card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={maxWidthClass}>
        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <DialogHeader>
              <DialogTitle id={titleId} className="text-[var(--text-primary)]">
                {title}
              </DialogTitle>
              <DialogDescription className="text-[var(--text-secondary)]">
                {subtitle}
              </DialogDescription>
            </DialogHeader>
            <div className="flex shrink-0 items-center gap-2">
              {headerTrailing}
              <DialogClose asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--danger)] hover:bg-[var(--danger)]/10 hover:text-[var(--action-delete-hover)]"
                >
                  ×
                </button>
              </DialogClose>
            </div>
          </div>
          {children}
        </Card>
      </DialogContent>
    </Dialog>
  );
}
