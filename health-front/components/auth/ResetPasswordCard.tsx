"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { toast } from "@/lib/toast";

type Props = {
  token: string;
};

export function ResetPasswordCard({ token }: Props) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState({ newPassword: false, confirmPassword: false });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validationErrors = useMemo(() => {
    const errors: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      errors.newPassword = "Password is required.";
    } else if (newPassword.length < 4) {
      errors.newPassword = "Password must be at least 4 characters.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm your password.";
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    return errors;
  }, [newPassword, confirmPassword]);

  const canSubmit = Object.keys(validationErrors).length === 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setHasSubmitted(true);
    setTouched({ newPassword: true, confirmPassword: true });

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const body = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Reset failed.");
      }

      toast.success(body?.message ?? "Password updated.");
      router.replace("/");
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
      title="Set a new password"
      description="Choose a new password for your account."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input
          label="New password"
          name="newPassword"
          type="password"
          placeholder="••••••••"
          value={newPassword}
          onChange={(event) =>
            setNewPassword(event.target.value)
          }
          onBlur={() =>
            setTouched((previous) => ({ ...previous, newPassword: true }))
          }
          errorMessage={
            touched.newPassword || hasSubmitted
              ? validationErrors.newPassword
              : undefined
          }
          hint="Minimum 4 characters."
          autoComplete="new-password"
        />
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(event.target.value)
          }
          onBlur={() =>
            setTouched((previous) => ({
              ...previous,
              confirmPassword: true,
            }))
          }
          errorMessage={
            touched.confirmPassword || hasSubmitted
              ? validationErrors.confirmPassword
              : undefined
          }
          autoComplete="new-password"
        />

        {submitError ? (
          <div className="rounded-xl border border-[var(--danger)]/30 bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
            {submitError}
          </div>
        ) : null}

        <Button type="submit" isLoading={isSubmitting} disabled={!canSubmit}>
          Update password
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
    </Card>
  );
}
