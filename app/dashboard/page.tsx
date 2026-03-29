"use client";

import RoleRedirect from "@/components/navigation/role-redirect";

export default function DashboardRedirectPage() {
  return (
    <RoleRedirect
      adminPath="/admin"
      operatorPath="/services"
      viewerPath="/docs"
      fallbackPath="/login"
    />
  );
}
