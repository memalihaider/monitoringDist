import { NextRequest, NextResponse } from "next/server";
import { queryPrometheus } from "@/lib/prometheus/client";

const allowedQueries: Record<string, string> = {
  up: "sum(up)",
  services_up: "sum(up{job=~\".*\"})",
  min_up_by_job: "min by (job) (up)",
  scrape_duration_by_job: "avg by (job) (scrape_duration_seconds)",
  cpu_load: "avg(rate(node_cpu_seconds_total{mode!=\"idle\"}[5m])) * 100",
  memory_used: "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
  alerts: "ALERTS",
};

export async function GET(request: NextRequest) {
  const queryName =
    request.nextUrl.searchParams.get("q") ??
    request.nextUrl.searchParams.get("query") ??
    "up";
  const promQl = allowedQueries[queryName];

  if (!promQl) {
    return NextResponse.json(
      {
        error:
          "Unsupported query. Use one of: up, services_up, min_up_by_job, scrape_duration_by_job, cpu_load, memory_used, alerts",
      },
      { status: 400 },
    );
  }

  try {
    const data = await queryPrometheus(promQl);
    return NextResponse.json({ queryName, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
