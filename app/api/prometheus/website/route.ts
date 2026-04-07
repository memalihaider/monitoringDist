import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/server-auth";
import { probeWebsite } from "@/lib/prometheus/website-probe";

export async function GET(request: NextRequest) {
  try {
    await authorizeRequest(request, ["admin", "operator", "viewer"]);

    const rawUrl = request.nextUrl.searchParams.get("url") ?? "";
    if (!rawUrl.trim()) {
      return NextResponse.json({ error: "Website URL is required" }, { status: 400 });
    }

    const timeoutInput = request.nextUrl.searchParams.get("timeoutMs");
    const timeoutMs = timeoutInput ? Number.parseInt(timeoutInput, 10) : 15000;

    if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
      return NextResponse.json({ error: "timeoutMs must be between 1000 and 60000" }, { status: 400 });
    }

    const result = await probeWebsite(rawUrl, timeoutMs);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status =
      message === "Insufficient permissions" ||
      message === "Missing bearer token" ||
      message === "Role not assigned"
        ? 403
        : message === "Invalid URL"
          ? 400
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
