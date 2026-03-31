import type { InputHTMLAttributes } from "react";
import { InputBase } from "@/components/ui/input-base";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  errorMessage?: string;
  hint?: string;
};

export function Input({
  label,
  errorMessage,
  hint,
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
      <InputBase
        {...rest}
        id={inputId}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={[
          hasError ? "border-[var(--danger)]" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {hasError ? (
        <span id={errorId} className="text-xs text-[var(--danger)]">
          {errorMessage}
        </span>
      ) : hint ? (
        <span className="text-xs text-[var(--text-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

