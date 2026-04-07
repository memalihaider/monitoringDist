import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/server-auth";
import { queryPrometheus } from "@/lib/prometheus/client";

export async function GET(request: NextRequest) {
  try {
    await authorizeRequest(request, ["admin", "operator", "viewer"]);

    const startedAt = Date.now();
    const result = await queryPrometheus("up");
    const durationMs = Date.now() - startedAt;

    return NextResponse.json({
      connected: true,
      resultCount: result.result.length,
      latencyMs: durationMs,
      checkedAt: new Date().toISOString(),
      demoMode: process.env.PROMETHEUS_DEMO_MODE?.toLowerCase() === "true",
      baseUrl: process.env.PROMETHEUS_BASE_URL ?? "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status =
      message === "Insufficient permissions" ||
      message === "Missing bearer token" ||
      message === "Role not assigned"
        ? 403
        : 500;

    return NextResponse.json(
      {
        connected: false,
        error: message,
        checkedAt: new Date().toISOString(),
        demoMode: process.env.PROMETHEUS_DEMO_MODE?.toLowerCase() === "true",
        baseUrl: process.env.PROMETHEUS_BASE_URL ?? "",
      },
      { status },
    );
  }
}