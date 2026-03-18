import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  isLoading?: boolean;
  leftIcon?: ReactNode;
};

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200",
  secondary:
    "bg-zinc-100 text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800",
  ghost:
    "bg-transparent text-zinc-950 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-900",
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
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
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

