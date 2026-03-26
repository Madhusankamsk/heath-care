"use client";

import { StaffManager, type StaffProfile } from "@/components/admin/StaffManager";

type Role = { id: string; roleName: string; description?: string | null };

type Props = {
  profiles: StaffProfile[];
  roles: Role[];
  canPreview: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
};

export function StaffSectionTabs(props: Props) {
  return (
    <div className="flex flex-col gap-4">
      <StaffManager
        initialProfiles={props.profiles}
        roles={props.roles}
        canPreview={props.canPreview}
        canCreate={props.canCreate}
        canEdit={props.canEdit}
        canDeactivate={props.canDeactivate}
        canDelete={props.canDelete}
      />
    </div>
  );
}

