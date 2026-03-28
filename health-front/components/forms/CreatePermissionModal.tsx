"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { CreatePermissionForm } from "@/components/forms/CreatePermissionForm";

export function CreatePermissionModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="create"
        onClick={() => setIsOpen(true)}
        className="h-10 px-4 text-xs sm:text-sm"
      >
        Create permission
      </Button>

      <ModalShell
        open={isOpen}
        onClose={() => setIsOpen(false)}
        titleId="create-permission-title"
        title="Create permission"
        subtitle="Add a new permission key to the system."
        maxWidthClass="max-w-lg"
      >
        <CreatePermissionForm onSuccess={() => setIsOpen(false)} />
      </ModalShell>
    </>
  );
}
