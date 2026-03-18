import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  errorMessage?: string;
};

export function Input({ label, errorMessage, className, id, ...rest }: InputProps) {
  const inputId = id ?? rest.name ?? label.replaceAll(" ", "-").toLowerCase();
  const errorId = `${inputId}-error`;
  const hasError = Boolean(errorMessage);

  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-zinc-800 dark:text-zinc-200">
        {label}
      </span>
      <input
        {...rest}
        id={inputId}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={[
          "h-11 rounded-xl border px-3 text-sm outline-none",
          "border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400",
          "focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200",
          "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-800",
          hasError ? "border-red-400 focus:ring-red-100 dark:border-red-500 dark:focus:ring-red-950" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {hasError ? (
        <span id={errorId} className="text-xs text-red-600 dark:text-red-400">
          {errorMessage}
        </span>
      ) : null}
    </label>
  );
}

