import { queryPrometheusDemoData } from "@/lib/prometheus/demo-data";

type PrometheusDataPoint = [number, string];

type PrometheusVectorResult = {
  metric: Record<string, string>;
  value: PrometheusDataPoint;
};

type PrometheusResponse = {
  status: "success" | "error";
  data?: {
    resultType: string;
    result?: unknown;
  };
  error?: string;
  errorType?: string;
};

function getPrometheusAuthorizationHeader() {
  const bearerToken = process.env.PROMETHEUS_BEARER_TOKEN?.trim();
  if (bearerToken) {
    return `Bearer ${bearerToken}`;
  }

  const basicUsername = process.env.PROMETHEUS_BASIC_AUTH_USERNAME?.trim();
  const basicPassword = process.env.PROMETHEUS_BASIC_AUTH_PASSWORD;

  if (basicUsername && typeof basicPassword === "string") {
    const credentials = Buffer.from(`${basicUsername}:${basicPassword}`, "utf8").toString("base64");
    return `Basic ${credentials}`;
  }

  if (basicUsername || typeof basicPassword === "string") {
    throw new Error(
      "Both PROMETHEUS_BASIC_AUTH_USERNAME and PROMETHEUS_BASIC_AUTH_PASSWORD must be set for basic auth",
    );
  }

  return null;
}

async function callPrometheusApi(pathname: string, params: Record<string, string>) {
  const baseUrl = process.env.PROMETHEUS_BASE_URL;

  if (!baseUrl) {
    throw new Error("PROMETHEUS_BASE_URL is missing");
  }

  const apiUrl = new URL(pathname, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    apiUrl.searchParams.set(key, value);
  }

  const headers: HeadersInit = {};
  const authHeader = getPrometheusAuthorizationHeader();
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    const localhostHint =
      baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")
        ? " Prometheus base URL points to localhost, which only works when Prometheus runs on the same host as this Next.js server."
        : "";

    throw new Error(`Failed to reach Prometheus at ${baseUrl}. ${message}.${localhostHint}`.trim());
  }

  let json: PrometheusResponse;
  try {
    json = (await response.json()) as PrometheusResponse;
  } catch {
    throw new Error(`Prometheus returned non-JSON response with status ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(json.error ?? `Prometheus query failed with status ${response.status}`);
  }

  if (json.status !== "success" || !json.data) {
    throw new Error(json.error ?? "Prometheus query returned invalid response");
  }

  return json.data;
}

export async function queryPrometheus(promQl: string) {
  const demoMode = process.env.PROMETHEUS_DEMO_MODE?.toLowerCase() === "true";
  const baseUrl = process.env.PROMETHEUS_BASE_URL;

  // Auto-enable demo mode if:
  // 1. Base URL is localhost/127.0.0.1 (development only)
  // 2. Base URL is not set
  // 3. We're in production and base URL points to localhost
  const shouldUseDemoMode = demoMode ||
    !baseUrl ||
    baseUrl.includes("localhost") ||
    baseUrl.includes("127.0.0.1") ||
    (process.env.NODE_ENV === "production" && baseUrl === "http://localhost:9090");

  if (shouldUseDemoMode) {
    return queryPrometheusDemoData(promQl);
  }

  const data = await callPrometheusApi("/api/v1/query", { query: promQl });
  return {
    resultType: data.resultType as "vector",
    result: (data.result as PrometheusVectorResult[]) ?? [],
  };
}

export async function queryPrometheusRange(promQl: string, start: number, end: number, step: string | number) {
  const demoMode = process.env.PROMETHEUS_DEMO_MODE?.toLowerCase() === "true";
  const baseUrl = process.env.PROMETHEUS_BASE_URL;

  // Auto-enable demo mode if:
  // 1. Base URL is localhost/127.0.0.1 (development only)
  // 2. Base URL is not set
  // 3. We're in production and base URL points to localhost
  const shouldUseDemoMode = demoMode ||
    !baseUrl ||
    baseUrl.includes("localhost") ||
    baseUrl.includes("127.0.0.1") ||
    (process.env.NODE_ENV === "production" && baseUrl === "http://localhost:9090");

  if (shouldUseDemoMode) {
    // For demo mode, return a single data point (range queries not supported in demo)
    return queryPrometheusDemoData(promQl);
  }

  const data = await callPrometheusApi("/api/v1/query_range", {
    query: promQl,
    start: String(start),
    end: String(end),
    step: String(step),
  });

  return data;
}

export async function getPrometheusTargets() {
  const data = await callPrometheusApi("/api/v1/targets", {});
  return data;
}
