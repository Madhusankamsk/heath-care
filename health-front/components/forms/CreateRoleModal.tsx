"use client";

import { useState } from "react";

import { useEscapeKey } from "@/lib/useEscapeKey";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CreateRoleForm } from "@/components/forms/CreateRoleForm";

export function CreateRoleModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEscapeKey(() => setIsOpen(false), isOpen);

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setIsOpen(true)}
        className="h-10 px-4 text-xs sm:text-sm"
      >
        Create role
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 px-4">
          <div className="max-w-lg flex-1">
            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Create role</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Add a new role to the system.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                  onClick={() => setIsOpen(false)}
                >
                  ×
                </button>
              </div>
              <CreateRoleForm />
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}

