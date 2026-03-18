import { Card } from "@/components/ui/Card";

export default function AdminStaffPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Coming next"
        description="We can wire this to Users/Roles once staff flows are defined."
      >
        <div className="text-sm text-zinc-700 dark:text-zinc-300">
          Typical actions:
          <ul className="mt-2 list-disc pl-5">
            <li>Create user</li>
            <li>Assign role</li>
            <li>Activate/deactivate</li>
            <li>Reset password</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

