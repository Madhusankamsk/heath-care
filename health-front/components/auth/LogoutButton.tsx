"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);
    try {
      await fetch("/api/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button
      variant="secondary"
      onClick={handleLogout}
      isLoading={isSubmitting}
      leftIcon={<LogOut className="h-4 w-4" aria-hidden />}
    >
      Sign out
    </Button>
  );
}

