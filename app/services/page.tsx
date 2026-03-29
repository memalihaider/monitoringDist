"use client";

import RoleRedirect from "@/components/navigation/role-redirect";

export default function ServicesRedirectPage() {
  return (
    <RoleRedirect
      adminPath="/admin/services"
      operatorPath="/operator/services"
      viewerPath="/viewer/services"
    />
  );
}
