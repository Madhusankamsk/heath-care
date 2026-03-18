"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";

type FormState = {
  email: string;
  password: string;
};

export function LoginCard() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({
    email: "",
    password: "",
  });
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
          errorMessage={validationErrors.email}
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
          errorMessage={validationErrors.password}
          autoComplete="current-password"
        />

        {submitError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
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

