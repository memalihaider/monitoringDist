import { NextRequest, NextResponse } from "next/server";
import { loadServicesCatalog } from "@/lib/admin/services-catalog";
import { authorizeRequest } from "@/lib/auth/server-auth";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    await authorizeRequest(request, ["admin", "operator", "viewer"]);
    const catalog = await loadServicesCatalog(getAdminDb());

    return NextResponse.json({
      services: catalog.services.filter((service) => service.enabled),
      manualCount: catalog.manualServices.length,
      autoCount: catalog.autoServiceCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status =
      message === "Insufficient permissions" ||
      message === "Missing bearer token" ||
      message === "Role not assigned"
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
