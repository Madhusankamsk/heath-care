"use client";

import { useEscapeKey } from "@/lib/useEscapeKey";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export type ConfirmModalVariant = "delete" | "edit" | "primary";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ConfirmModalVariant;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  isConfirming = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  useEscapeKey(onCancel, open);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent
        className="z-[81] max-w-md"
        overlayClassName="z-[80] bg-black/40"
      >
        <Card>
          <h2
            id="confirm-modal-title"
            className="mb-2 text-lg font-semibold tracking-tight text-[var(--text-primary)]"
          >
            {title}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">{message}</p>
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isConfirming}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={confirmVariant}
              onClick={onConfirm}
              isLoading={isConfirming}
            >
              {confirmLabel}
            </Button>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
