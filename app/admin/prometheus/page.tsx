"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, LineChart } from "lucide-react";

type PrometheusVectorResult = {
  metric: Record<string, string>;
  value: [number, string];
};

type PrometheusQueryResponse = {
  queryName: string;
  data?: {
    resultType?: string;
    result?: PrometheusVectorResult[];
  };
  error?: string;
};

type QueryOption = {
  value: string;
  label: string;
  description: string;
};

const QUERIES: QueryOption[] = [
  { value: "up", label: "Total Up", description: "Total count of targets reporting up." },
  { value: "services_up", label: "Services Up", description: "Sum of services marked up across jobs." },
  { value: "min_up_by_job", label: "Min Up by Job", description: "Minimum up per job to detect outages." },
  { value: "scrape_duration_by_job", label: "Scrape Duration", description: "Average scrape duration per job." },
  { value: "cpu_load", label: "CPU Load", description: "Average CPU load percentage." },
  { value: "memory_used", label: "Memory Used", description: "Memory utilization percentage." },
  { value: "alerts", label: "Active Alerts", description: "Current alerts firing in Prometheus." },
];

export default function AdminPrometheusPage() {
  const [queryKey, setQueryKey] = useState("services_up");
  const [data, setData] = useState<PrometheusQueryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadQuery() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/prometheus/query?q=${queryKey}`);
        const result = (await response.json()) as PrometheusQueryResponse;
        if (!response.ok) {
          throw new Error(result.error ?? "Failed to query Prometheus");
        }
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to query Prometheus";
        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadQuery();
    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  const series = useMemo(() => data?.data?.result ?? [], [data]);

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Telemetry console</p>
            <h3 className="admin-title text-2xl">Prometheus queries</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Run approved queries against Prometheus and inspect live telemetry output.
            </p>
          </div>
          <div className="min-w-55">
            <label className="text-xs uppercase tracking-widest text-(--admin-muted)">
              Query
              <select
                className="mt-2 w-full rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
                value={queryKey}
                onChange={(event) => setQueryKey(event.target.value)}
              >
                {QUERIES.map((query) => (
                  <option key={query.value} value={query.value}>
                    {query.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="admin-panel p-6">
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            <h4 className="admin-title text-lg">Query output</h4>
          </div>
          <p className="mt-2 text-sm text-(--admin-muted)">
            {QUERIES.find((query) => query.value === queryKey)?.description ?? ""}
          </p>

          {loading ? (
            <div className="mt-6 grid place-items-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--admin-ink) border-t-transparent" />
            </div>
          ) : error ? (
            <p className="mt-6 text-sm font-semibold text-red-700">{error}</p>
          ) : series.length === 0 ? (
            <p className="mt-6 text-sm text-(--admin-muted)">No data returned for this query.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {series.slice(0, 8).map((entry, idx) => (
                <div
                  key={`${entry.metric?.instance ?? "metric"}-${idx}`}
                  className="rounded-2xl border border-(--admin-line) bg-white/80 p-3"
                >
                  <p className="text-xs uppercase tracking-widest text-(--admin-muted)">Series {idx + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-(--admin-ink)">
                    {entry.metric?.job ?? entry.metric?.instance ?? "metric"}
                  </p>
                  <p className="mt-1 text-xs text-(--admin-muted)">
                    Value: {entry.value?.[1] ?? "n/a"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-panel p-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <h4 className="admin-title text-lg">Query summary</h4>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-(--admin-muted)">Series returned</span>
              <span className="font-semibold">{series.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-(--admin-muted)">Result type</span>
              <span className="font-semibold">{data?.data?.resultType ?? "vector"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-(--admin-muted)">Query key</span>
              <span className="font-semibold">{data?.queryName ?? queryKey}</span>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-(--admin-line) bg-white/80 p-4 text-xs text-(--admin-muted)">
            Results are sampled from the Prometheus data source and limited to approved queries.
          </div>
        </div>
      </section>
    </div>
  );
}
