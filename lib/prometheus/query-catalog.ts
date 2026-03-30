export type BuiltInPrometheusQuery = {
  key: string;
  label: string;
  description: string;
  promQl: string;
};

export const BUILT_IN_PROMETHEUS_QUERIES: BuiltInPrometheusQuery[] = [
  {
    key: "up",
    label: "Total Up",
    description: "Total count of targets reporting up.",
    promQl: "sum(up)",
  },
  {
    key: "services_up",
    label: "Services Up",
    description: "Sum of services marked up across jobs.",
    promQl: 'sum(up{job=~".*"})',
  },
  {
    key: "min_up_by_job",
    label: "Min Up by Job",
    description: "Minimum up per job to detect outages.",
    promQl: "min by (job) (up)",
  },
  {
    key: "scrape_duration_by_job",
    label: "Scrape Duration",
    description: "Average scrape duration per job.",
    promQl: "avg by (job) (scrape_duration_seconds)",
  },
  {
    key: "cpu_load",
    label: "CPU Load",
    description: "Average CPU load percentage.",
    promQl: 'avg(rate(node_cpu_seconds_total{mode!="idle"}[5m])) * 100',
  },
  {
    key: "memory_used",
    label: "Memory Used",
    description: "Memory utilization percentage.",
    promQl: "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
  },
  {
    key: "alerts",
    label: "Active Alerts",
    description: "Current alerts firing in Prometheus.",
    promQl: "ALERTS",
  },
];

export function normalizePrometheusQueryKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}
