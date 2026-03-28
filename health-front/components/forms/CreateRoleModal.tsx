"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { CreateRoleForm } from "@/components/forms/CreateRoleForm";

export function CreateRoleModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="create"
        onClick={() => setIsOpen(true)}
        className="h-10 px-4 text-xs sm:text-sm"
      >
        Create role
      </Button>

      <ModalShell
        open={isOpen}
        onClose={() => setIsOpen(false)}
        titleId="create-role-title"
        title="Create role"
        subtitle="Add a new role to the system."
        maxWidthClass="max-w-lg"
      >
        <CreateRoleForm onSuccess={() => setIsOpen(false)} />
      </ModalShell>
    </>
  );
}
