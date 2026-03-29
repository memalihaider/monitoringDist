"use client";

import RoleRedirect from "@/components/navigation/role-redirect";

export default function SettingsRedirectPage() {
  return (
    <RoleRedirect
      adminPath="/admin/settings"
      operatorPath="/operator/settings"
      viewerPath="/viewer/settings"
    />
  );
}
