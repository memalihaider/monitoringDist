import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/server-auth";
import { getPrometheusTargets } from "@/lib/prometheus/client";

export async function GET(request: NextRequest) {
  try {
    await authorizeRequest(request, ["admin", "operator", "viewer"]);

    const data = await getPrometheusTargets();
    return NextResponse.json({ data });
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
