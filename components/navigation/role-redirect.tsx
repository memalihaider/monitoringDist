"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import type { AppRole } from "@/lib/auth/roles";

type RoleRedirectProps = {
  adminPath: string;
  operatorPath: string;
  viewerPath: string;
  fallbackPath?: string;
};

function resolveTarget(role: AppRole | null, props: RoleRedirectProps) {
  if (role === "admin") return props.adminPath;
  if (role === "operator") return props.operatorPath;
  return props.viewerPath;
}

export default function RoleRedirect({
  adminPath,
  operatorPath,
  viewerPath,
  fallbackPath = "/login",
}: RoleRedirectProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(fallbackPath);
      return;
    }

    const target = resolveTarget(role, { adminPath, operatorPath, viewerPath, fallbackPath });
    router.replace(target);
  }, [adminPath, fallbackPath, loading, operatorPath, role, router, user, viewerPath]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
    </div>
  );
}
