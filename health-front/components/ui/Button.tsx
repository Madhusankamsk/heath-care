"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand-primary)] text-white shadow-sm hover:bg-[var(--brand-primary-strong)]",
        secondary:
          "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-2)]",
        ghost: "bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-2)]",
        create:
          "bg-[var(--action-create)] text-white shadow-sm hover:bg-[var(--action-create-hover)]",
        edit: "bg-[var(--action-edit)] text-white shadow-sm hover:bg-[var(--action-edit-hover)]",
        delete:
          "bg-[var(--action-delete)] text-white shadow-sm hover:bg-[var(--action-delete-hover)]",
        preview:
          "bg-[var(--action-preview)] text-white shadow-sm hover:bg-[var(--action-preview-hover)]",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 px-4",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ShadButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function ShadButton({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ShadButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "create"
  | "edit"
  | "delete"
  | "preview";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  isLoading?: boolean;
  leftIcon?: ReactNode;
};

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--brand-primary)] text-white shadow-sm hover:bg-[var(--brand-primary-strong)]",
  secondary:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-2)]",
  ghost:
    "bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-2)]",
  create:
    "bg-[var(--action-create)] text-white shadow-sm hover:bg-[var(--action-create-hover)]",
  edit:
    "bg-[var(--action-edit)] text-white shadow-sm hover:bg-[var(--action-edit-hover)]",
  delete:
    "bg-[var(--action-delete)] text-white shadow-sm hover:bg-[var(--action-delete-hover)]",
  preview:
    "bg-[var(--action-preview)] text-white shadow-sm hover:bg-[var(--action-preview-hover)]",
};

export function Button({
  className,
  variant = "primary",
  isLoading,
  leftIcon,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);

  return (
    <ShadButton
      {...rest}
      disabled={isDisabled}
      size="default"
      className={[
        variantClassName[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {leftIcon}
      {isLoading ? "Please wait…" : children}
    </ShadButton>
  );
}
