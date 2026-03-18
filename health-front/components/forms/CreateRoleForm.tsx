"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function CreateRoleForm() {
  const router = useRouter();
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(() => {
    const value = roleName.trim();
    if (!value) return "Role name is required.";
    if (value.length < 2) return "Role name must be at least 2 characters.";
    return null;
  }, [roleName]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (validationError) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleName: roleName.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string; error?: string }
          | null;
        throw new Error(body?.message ?? body?.error ?? "Failed to create role.");
      }

      setRoleName("");
      setDescription("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Role name"
          name="roleName"
          placeholder="Admin"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          errorMessage={validationError ?? undefined}
        />
        <Input
          label="Description (optional)"
          name="description"
          placeholder="Full access to admin features"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-end">
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={Boolean(validationError)}
        >
          Create role
        </Button>
      </div>
    </form>
  );
}

