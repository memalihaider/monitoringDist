import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/server-auth";
import { queryPrometheus } from "@/lib/prometheus/client";

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.includes("/");
}

export async function GET(request: NextRequest) {
  try {
    await authorizeRequest(request, ["admin", "operator", "viewer"]);

    const query = request.nextUrl.searchParams.get("query")?.trim() ?? "up";
    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    if (looksLikeUrl(query)) {
      return NextResponse.json(
        {
          error:
            "The query parameter must be PromQL, not a website URL. Use /api/prometheus/website?url=<your_url> for website checks.",
        },
        { status: 400 },
      );
    }

    const data = await queryPrometheus(query);
    return NextResponse.json({ query, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status =
      message === "Insufficient permissions" ||
      message === "Missing bearer token" ||
      message === "Role not assigned"
        ? 403
        : message.includes("invalid parameter \"query\"")
          ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
