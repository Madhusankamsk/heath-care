"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { toast } from "@/lib/toast";

type FormState = {
  email: string;
  password: string;
};

type TouchedState = {
  email: boolean;
  password: boolean;
};

export function LoginCard() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({
    email: "",
    password: "",
  });
  const [touched, setTouched] = useState<TouchedState>({
    email: false,
    password: false,
  });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validationErrors = useMemo(() => {
    const errors: Partial<Record<keyof FormState, string>> = {};

    if (!formState.email.trim()) {
      errors.email = "Email is required.";
    } else if (!formState.email.includes("@")) {
      errors.email = "Enter a valid email address.";
    }

    if (!formState.password) {
      errors.password = "Password is required.";
    } else if (formState.password.length < 4) {
      errors.password = "Password must be at least 4 characters.";
    }

    return errors;
  }, [formState.email, formState.password]);

  const canSubmit = Object.keys(validationErrors).length === 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setHasSubmitted(true);
    setTouched({ email: true, password: true });

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        const responseBody = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(responseBody?.error ?? "Login failed.");
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card
      title="Welcome back"
      description="Enter your details to access the dashboard."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@company.com"
          value={formState.email}
          onChange={(event) =>
            setFormState((previousState) => ({
              ...previousState,
              email: event.target.value,
            }))
          }
          onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
          errorMessage={
            touched.email || hasSubmitted ? validationErrors.email : undefined
          }
          hint="Use your work email."
          autoComplete="email"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={formState.password}
          onChange={(event) =>
            setFormState((previousState) => ({
              ...previousState,
              password: event.target.value,
            }))
          }
          onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
          errorMessage={
            touched.password || hasSubmitted
              ? validationErrors.password
              : undefined
          }
          hint="Minimum 4 characters."
          autoComplete="current-password"
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)]"
          >
            Forgot password?
          </Link>
        </div>

        {submitError ? (
          <div className="rounded-xl border border-[var(--danger)]/30 bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
            {submitError}
          </div>
        ) : null}

        <Button type="submit" isLoading={isSubmitting} disabled={!canSubmit}>
          Sign in
        </Button>
      </form>
    </Card>
  );
}

