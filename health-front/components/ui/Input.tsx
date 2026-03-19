import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  errorMessage?: string;
};

export function Input({
  label,
  errorMessage,
  className,
  id,
  ...rest
}: InputProps) {
  const inputId = id ?? rest.name ?? label.replaceAll(" ", "-").toLowerCase();
  const errorId = `${inputId}-error`;
  const hasError = Boolean(errorMessage);

  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      <input
        {...rest}
        id={inputId}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={[
          "h-11 rounded-xl border px-3 text-sm outline-none transition-colors",
          "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
          "focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_25%,transparent)]",
          hasError
            ? "border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_24%,transparent)]"
            : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {hasError ? (
        <span id={errorId} className="text-xs text-[var(--danger)]">
          {errorMessage}
        </span>
      ) : null}
    </label>
  );
}

