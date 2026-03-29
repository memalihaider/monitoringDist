"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import type { AppRole } from "@/lib/auth/roles";
import { hasMinimumRole } from "@/lib/auth/roles";

export default function ProtectedRoute({
  children,
  minimumRole = "viewer",
}: {
  children: ReactNode;
  minimumRole?: AppRole;
}) {
  const router = useRouter();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!role || !hasMinimumRole(role, minimumRole)) {
      router.replace("/");
    }
  }, [loading, minimumRole, role, router, user]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="text-sm text-slate-500">Loading your workspace...</p>
      </div>
    );
  }

  if (!user || !role || !hasMinimumRole(role, minimumRole)) {
    return null;
  }

  return <>{children}</>;
}
