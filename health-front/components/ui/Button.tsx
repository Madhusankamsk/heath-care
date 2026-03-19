import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

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
    <button
      {...rest}
      disabled={isDisabled}
      className={[
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold tracking-wide",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variantClassName[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {leftIcon}
      {isLoading ? "Please wait…" : children}
    </button>
  );
}

