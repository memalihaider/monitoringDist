"use client";

import RoleRedirect from "@/components/navigation/role-redirect";

export default function AlertsRedirectPage() {
  return (
    <RoleRedirect
      adminPath="/admin/alerts"
      operatorPath="/operator/alerts"
      viewerPath="/viewer/alerts"
    />
  );
}
