"use client";

import RoleRedirect from "@/components/navigation/role-redirect";

export default function DocsRedirectPage() {
  return (
    <RoleRedirect
      adminPath="/admin/docs"
      operatorPath="/operator/docs"
      viewerPath="/viewer/docs"
    />
  );
}
