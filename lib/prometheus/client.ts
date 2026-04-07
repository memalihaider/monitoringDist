import { queryPrometheusDemoData } from "@/lib/prometheus/demo-data";

type PrometheusDataPoint = [number, string];

type PrometheusVectorResult = {
  metric: Record<string, string>;
  value: PrometheusDataPoint;
};

type PrometheusResponse = {
  status: "success" | "error";
  data?: {
    resultType: "vector";
    result: PrometheusVectorResult[];
  };
  error?: string;
  errorType?: string;
};

export async function queryPrometheus(promQl: string) {
  const demoMode = process.env.PROMETHEUS_DEMO_MODE?.toLowerCase() === "true";

  if (demoMode) {
    return queryPrometheusDemoData(promQl);
  }

  const baseUrl = process.env.PROMETHEUS_BASE_URL;

  if (!baseUrl) {
    throw new Error("PROMETHEUS_BASE_URL is missing");
  }

  const queryUrl = new URL("/api/v1/query", baseUrl);
  queryUrl.searchParams.set("query", promQl);

  const headers: HeadersInit = {};
  if (process.env.PROMETHEUS_BEARER_TOKEN) {
    headers.Authorization = `Bearer ${process.env.PROMETHEUS_BEARER_TOKEN}`;
  }

  const response = await fetch(queryUrl, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Prometheus query failed with status ${response.status}`);
  }

  const json = (await response.json()) as PrometheusResponse;

  if (json.status !== "success" || !json.data) {
    throw new Error(json.error ?? "Prometheus query returned invalid response");
  }

  return json.data;
}
