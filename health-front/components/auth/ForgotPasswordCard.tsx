"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button, ShadButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { toast } from "@/lib/toast";

const GENERIC_SUCCESS =
  "If an account exists for this email, you will receive reset instructions.";

export function ForgotPasswordCard() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validationError = useMemo(() => {
    if (!email.trim()) {
      return "Email is required.";
    }
    if (!email.includes("@")) {
      return "Enter a valid email address.";
    }
    return undefined;
  }, [email]);

  const canSubmit = !validationError;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);
    setHasSubmitted(true);
    setTouched(true);

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const body = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Something went wrong.");
      }

      setSuccessMessage(body?.message ?? GENERIC_SUCCESS);
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
      title="Forgot password"
      description="We will email you a link to reset your password if an account exists."
    >
      {successMessage ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-secondary)]">{successMessage}</p>
          <ShadButton asChild variant="secondary">
            <Link href="/">Back to sign in</Link>
          </ShadButton>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setTouched(true)}
            errorMessage={
              touched || hasSubmitted ? validationError : undefined
            }
            autoComplete="email"
          />

          {submitError ? (
            <div className="rounded-xl border border-[var(--danger)]/30 bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
              {submitError}
            </div>
          ) : null}

          <Button type="submit" isLoading={isSubmitting} disabled={!canSubmit}>
            Send reset link
          </Button>

          <p className="text-center text-sm text-[var(--text-secondary)]">
            <Link
              href="/"
              className="font-medium text-[var(--text-primary)] underline underline-offset-2"
            >
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </Card>
  );
}
