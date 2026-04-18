"use client";

import { StaffManager, type StaffProfile } from "@/components/admin/StaffManager";

type Role = { id: string; roleName: string; description?: string | null };

type Props = {
  profiles: StaffProfile[];
  total: number;
  initialPage: number;
  pageSize?: number;
  roles: Role[];
  canPreview: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
  initialQuery?: string;
};

export function StaffSectionTabs(props: Props) {
  return (
    <div className="flex flex-col gap-4">
      <StaffManager
        initialProfiles={props.profiles}
        total={props.total}
        initialPage={props.initialPage}
        pageSize={props.pageSize}
        roles={props.roles}
        canPreview={props.canPreview}
        canCreate={props.canCreate}
        canEdit={props.canEdit}
        canDeactivate={props.canDeactivate}
        canDelete={props.canDelete}
        initialQuery={props.initialQuery ?? ""}
      />
    </div>
  );
}

