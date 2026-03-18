"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

export function CreatePermissionForm() {
  const router = useRouter();
  const [permissionKey, setPermissionKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(() => {
    const value = permissionKey.trim();
    if (!value) return "Permission key is required.";
    if (value.length < 3) return "Permission key must be at least 3 characters.";
    return null;
  }, [permissionKey]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (validationError) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionKey: permissionKey.trim() }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string; error?: string }
          | null;
        throw new Error(
          body?.message ?? body?.error ?? "Failed to create permission.",
        );
      }

      setPermissionKey("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <Input
        label="Permission key"
        name="permissionKey"
        placeholder="roles:read"
        value={permissionKey}
        onChange={(e) => setPermissionKey(e.target.value)}
        errorMessage={validationError ?? undefined}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-end">
        <Button type="submit" isLoading={isSubmitting} disabled={Boolean(validationError)}>
          Create permission
        </Button>
      </div>
    </form>
  );
}

