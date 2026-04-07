type PrometheusDataPoint = [number, string];

type PrometheusVectorResult = {
  metric: Record<string, string>;
  value: PrometheusDataPoint;
};

const DEMO_JOBS = [
  { job: "api-gateway", instance: "api-gateway-01", up: 1 },
  { job: "payments-service", instance: "payments-service-01", up: 1 },
  { job: "billing-worker", instance: "billing-worker-01", up: 1 },
  { job: "inventory-service", instance: "inventory-service-01", up: 1 },
  { job: "notification-service", instance: "notification-service-01", up: 0 },
];

function createPoint(value: number): PrometheusDataPoint {
  return [Math.floor(Date.now() / 1000), value.toFixed(2)];
}

function normalized(input: string) {
  return input.replace(/\s+/g, " ").trim().toLowerCase();
}

function buildMinUpByJob(): PrometheusVectorResult[] {
  return DEMO_JOBS.map((entry) => ({
    metric: { job: entry.job, instance: entry.instance },
    value: createPoint(entry.up),
  }));
}

function buildCpuLoad(): PrometheusVectorResult[] {
  return [
    {
      metric: { __name__: "cpu_load_demo", region: "demo-region-1" },
      value: createPoint(61.3),
    },
  ];
}

function buildMemoryUsed(): PrometheusVectorResult[] {
  return [
    {
      metric: { __name__: "memory_used_demo", region: "demo-region-1" },
      value: createPoint(72.4),
    },
  ];
}

function buildAlerts(): PrometheusVectorResult[] {
  return [
    {
      metric: {
        alertname: "HighCPUUsage",
        severity: "critical",
        job: "api-gateway",
        instance: "api-gateway-01",
      },
      value: createPoint(1),
    },
    {
      metric: {
        alertname: "LatencyP95High",
        severity: "warning",
        job: "payments-service",
        instance: "payments-service-01",
      },
      value: createPoint(1),
    },
  ];
}

function buildUp(): PrometheusVectorResult[] {
  const sum = DEMO_JOBS.reduce((acc, entry) => acc + entry.up, 0);
  return [{ metric: { __name__: "up" }, value: createPoint(sum) }];
}

function buildServicesUp(): PrometheusVectorResult[] {
  return buildUp();
}

function buildScrapeDurationByJob(): PrometheusVectorResult[] {
  return DEMO_JOBS.map((entry, index) => ({
    metric: { job: entry.job },
    value: createPoint(0.18 + index * 0.03),
  }));
}

export function queryPrometheusDemoData(promQl: string): { resultType: "vector"; result: PrometheusVectorResult[] } {
  const query = normalized(promQl);

  if (query === "alerts") {
    return { resultType: "vector", result: buildAlerts() };
  }

  if (query.includes("min by (job) (up)")) {
    return { resultType: "vector", result: buildMinUpByJob() };
  }

  if (query.includes("sum(up{job=~\".*\"})")) {
    return { resultType: "vector", result: buildServicesUp() };
  }

  if (query.includes("sum(up)")) {
    return { resultType: "vector", result: buildUp() };
  }

  if (query.includes("avg by (job) (scrape_duration_seconds)")) {
    return { resultType: "vector", result: buildScrapeDurationByJob() };
  }

  if (query.includes("avg(rate(node_cpu_seconds_total")) {
    return { resultType: "vector", result: buildCpuLoad() };
  }

  if (query.includes("node_memory_memavailable_bytes") || query.includes("node_memory_memtotal_bytes")) {
    return { resultType: "vector", result: buildMemoryUsed() };
  }

  return { resultType: "vector", result: buildMinUpByJob() };
}