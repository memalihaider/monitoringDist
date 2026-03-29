"use client";

import RoleRedirect from "@/components/navigation/role-redirect";

export default function ReportsRedirectPage() {
  return (
    <RoleRedirect
      adminPath="/admin/reports"
      operatorPath="/operator/reports"
      viewerPath="/viewer/reports"
    />
  );
}
