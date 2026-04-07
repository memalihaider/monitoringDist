"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { Activity, Gauge, Globe, LineChart, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";

type PrometheusVectorResult = {
  metric: Record<string, string>;
  value: [number, string];
};

type QueryRecord = {
  id: string;
  key: string;
  label: string;
  description: string;
  promQl: string;
  source: "builtin" | "custom";
  editable: boolean;
  enabled: boolean;
  updatedAt: string;
};

type QueryListResponse = {
  queries?: QueryRecord[];
  error?: string;
};

type PrometheusQueryResponse = {
  queryName: string;
  label?: string;
  description?: string;
  data?: {
    resultType?: string;
    result?: PrometheusVectorResult[];
  };
  error?: string;
};

type PrometheusStatusResponse = {
  connected: boolean;
  error?: string;
  checkedAt?: string;
  latencyMs?: number;
  resultCount?: number;
  demoMode?: boolean;
  baseUrl?: string;
};

type WebsiteProbeResponse = {
  targetUrl: string;
  finalUrl: string;
  checkedAt: string;
  available: boolean;
  statusCode: number;
  statusText: string;
  responseTimeMs: number;
  responseSizeBytes: number | null;
  contentType: string;
  title: string;
  contentMetrics: {
    links: number;
    images: number;
    scripts: number;
    forms: number;
    headings: number;
  };
  securityHeaders: {
    strictTransportSecurity: boolean;
    contentSecurityPolicy: boolean;
    xContentTypeOptions: boolean;
    xFrameOptions: boolean;
    referrerPolicy: boolean;
  };
  metricsEndpoint: {
    checked: boolean;
    available: boolean;
    endpoint: string;
    statusCode?: number;
    metricCount?: number;
    sampleMetricNames?: string[];
  };
  error?: string;
};

type QueryForm = {
  id: string;
  key: string;
  label: string;
  description: string;
  promQl: string;
  enabled: boolean;
};

const EMPTY_FORM: QueryForm = {
  id: "",
  key: "",
  label: "",
  description: "",
  promQl: "",
  enabled: true,
};

export default function AdminPrometheusPage() {
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [queryKey, setQueryKey] = useState("up");
  const [data, setData] = useState<PrometheusQueryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingQueries, setLoadingQueries] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningQuery, setRunningQuery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<QueryForm>(EMPTY_FORM);
  const [status, setStatus] = useState<PrometheusStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState("https://example.com");
  const [websiteProbeLoading, setWebsiteProbeLoading] = useState(false);
  const [websiteProbeError, setWebsiteProbeError] = useState<string | null>(null);
  const [websiteProbe, setWebsiteProbe] = useState<WebsiteProbeResponse | null>(null);

  const loadQueries = useCallback(async () => {
    setLoadingQueries(true);
    setError(null);

    try {
      const response = await authenticatedFetch("/api/admin/prometheus");
      const result = (await response.json()) as QueryListResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load Prometheus queries");
      }

      const nextQueries = result.queries ?? [];
      setQueries(nextQueries);
      if (nextQueries.length > 0 && !nextQueries.some((entry) => entry.key === queryKey)) {
        setQueryKey(nextQueries[0].key);
      }
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to load Prometheus queries";
      setError(nextMessage);
    } finally {
      setLoadingQueries(false);
    }
  }, [queryKey]);

  const loadQueryResult = useCallback(async () => {
    if (!queryKey) {
      return;
    }

    setRunningQuery(true);
    setError(null);

    try {
      const response = await authenticatedFetch(`/api/prometheus/query?q=${encodeURIComponent(queryKey)}`);
      const result = (await response.json()) as PrometheusQueryResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to query Prometheus");
      }
      setData(result);
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to query Prometheus";
      setError(nextMessage);
    } finally {
      setRunningQuery(false);
      setLoading(false);
    }
  }, [queryKey]);

  const loadPrometheusStatus = useCallback(async () => {
    setStatusLoading(true);

    try {
      const response = await authenticatedFetch("/api/prometheus/status");
      const result = (await response.json()) as PrometheusStatusResponse;

      if (!response.ok) {
        setStatus({ ...result, connected: false });
        return;
      }

      setStatus(result);
    } catch {
      setStatus({
        connected: false,
        error: "Failed to check Prometheus connection",
      });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueries();
  }, [loadQueries]);

  useEffect(() => {
    void loadQueryResult();
  }, [loadQueryResult]);

  useEffect(() => {
    void loadPrometheusStatus();
    const timer = setInterval(() => {
      void loadPrometheusStatus();
    }, 30000);

    return () => clearInterval(timer);
  }, [loadPrometheusStatus]);

  function startEdit(query: QueryRecord) {
    if (!query.editable) {
      setMessage("Built-in query presets cannot be edited directly.");
      return;
    }

    setForm({
      id: query.id,
      key: query.key,
      label: query.label,
      description: query.description,
      promQl: query.promQl,
      enabled: query.enabled,
    });
    setMessage(`Editing query ${query.key}`);
    setError(null);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  async function saveQuery() {
    if (!form.key.trim() || !form.label.trim() || !form.promQl.trim()) {
      setError("Query key, label, and PromQL are required");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch("/api/admin/prometheus", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save query");
      }

      setMessage(form.id ? "Query updated" : "Query created");
      resetForm();
      await loadQueries();
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to save query";
      setError(nextMessage);
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuery(id: string) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch(`/api/admin/prometheus?id=${id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to delete query");
      }

      if (form.id === id) {
        resetForm();
      }

      setMessage("Query deleted");
      await loadQueries();
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to delete query";
      setError(nextMessage);
    } finally {
      setSaving(false);
    }
  }

  async function runWebsiteProbe() {
    if (!websiteUrl.trim()) {
      setWebsiteProbeError("Please provide a website URL");
      return;
    }

    setWebsiteProbeLoading(true);
    setWebsiteProbeError(null);

    try {
      const response = await authenticatedFetch(`/api/prometheus/website?url=${encodeURIComponent(websiteUrl)}`);
      const result = (await response.json()) as WebsiteProbeResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to probe website");
      }

      setWebsiteProbe(result);
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to probe website";
      setWebsiteProbeError(nextMessage);
      setWebsiteProbe(null);
    } finally {
      setWebsiteProbeLoading(false);
    }
  }

  const selectedQuery = useMemo(
    () => queries.find((query) => query.key === queryKey) ?? null,
    [queries, queryKey],
  );
  const series = useMemo(() => data?.data?.result ?? [], [data]);

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Telemetry console</p>
            <h3 className="admin-title text-2xl">Prometheus queries</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Run live queries and manage the approved query catalog.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="admin-chip">Presets: {queries.length}</span>
            <span className="admin-chip">Custom: {queries.filter((entry) => entry.source === "custom").length}</span>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </section>

      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Connection health</p>
            <h4 className="admin-title text-lg">Prometheus Connection Status</h4>
            <p className="mt-1 text-sm text-(--admin-muted)">
              Simple connectivity check for non-technical users.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                statusLoading
                  ? "border-(--admin-line) bg-white"
                  : status?.connected
                    ? "border-[rgba(28,140,112,0.55)] bg-[rgba(28,140,112,0.12)]"
                    : "border-[rgba(190,65,65,0.5)] bg-[rgba(190,65,65,0.12)]"
              }`}
            >
              {statusLoading ? "Checking" : status?.connected ? "Connected" : "Failed"}
            </span>
            <button
              onClick={() => {
                void loadPrometheusStatus();
              }}
              className="rounded-full border border-(--admin-line) bg-white px-3 py-1.5 text-xs font-semibold"
              disabled={statusLoading}
            >
              {statusLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-xs text-(--admin-muted) sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-(--admin-line) bg-white/80 p-3">
            <p className="uppercase tracking-wider">Mode</p>
            <p className="mt-1 text-sm font-semibold text-(--admin-ink)">{status?.demoMode ? "Demo" : "Real"}</p>
          </div>
          <div className="rounded-xl border border-(--admin-line) bg-white/80 p-3">
            <p className="uppercase tracking-wider">Latency</p>
            <p className="mt-1 text-sm font-semibold text-(--admin-ink)">
              {typeof status?.latencyMs === "number" ? `${status.latencyMs} ms` : "-"}
            </p>
          </div>
          <div className="rounded-xl border border-(--admin-line) bg-white/80 p-3">
            <p className="uppercase tracking-wider">Result Rows</p>
            <p className="mt-1 text-sm font-semibold text-(--admin-ink)">
              {typeof status?.resultCount === "number" ? status.resultCount : "-"}
            </p>
          </div>
          <div className="rounded-xl border border-(--admin-line) bg-white/80 p-3">
            <p className="uppercase tracking-wider">Last Check</p>
            <p className="mt-1 text-sm font-semibold text-(--admin-ink)">
              {status?.checkedAt ? new Date(status.checkedAt).toLocaleTimeString() : "-"}
            </p>
          </div>
        </div>

        {status?.connected === false && status.error ? (
          <p className="mt-3 text-sm font-semibold text-red-700">{status.error}</p>
        ) : null}
      </section>

      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Website monitoring</p>
            <h4 className="admin-title text-lg">Probe any website URL</h4>
            <p className="mt-1 text-sm text-(--admin-muted)">
              Enter a public URL to collect live availability, response, and page-level metrics.
            </p>
          </div>
          <Globe className="h-5 w-5 text-(--admin-muted)" />
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            placeholder="https://your-site.com"
            className="w-full rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              void runWebsiteProbe();
            }}
            disabled={websiteProbeLoading}
            className="rounded-full border border-(--admin-ink) bg-(--admin-ink) px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {websiteProbeLoading ? "Probing..." : "Probe URL"}
          </button>
        </div>

        {websiteProbeError ? <p className="mt-3 text-sm font-semibold text-red-700">{websiteProbeError}</p> : null}

        {websiteProbe ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 text-xs text-(--admin-muted) sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-(--admin-line) bg-white/80 p-3">
                <p className="uppercase tracking-wider">Availability</p>
                <p className="mt-1 text-sm font-semibold text-(--admin-ink)">
                  {websiteProbe.available ? "UP" : "DOWN"}
                </p>
              </div>
              <div className="rounded-xl border border-(--admin-line) bg-white/80 p-3">
                <p className="uppercase tracking-wider">HTTP Status</p>
                <p className="mt-1 text-sm font-semibold text-(--admin-ink)">
                  {websiteProbe.statusCode} {websiteProbe.statusText}
                </p>
              </div>
              <div className="rounded-xl border border-(--admin-line) bg-white/80 p-3">
                <p className="uppercase tracking-wider">Response Time</p>
                <p className="mt-1 text-sm font-semibold text-(--admin-ink)">{websiteProbe.responseTimeMs} ms</p>
              </div>
              <div className="rounded-xl border border-(--admin-line) bg-white/80 p-3">
                <p className="uppercase tracking-wider">Payload Size</p>
                <p className="mt-1 text-sm font-semibold text-(--admin-ink)">
                  {typeof websiteProbe.responseSizeBytes === "number"
                    ? `${websiteProbe.responseSizeBytes.toLocaleString()} bytes`
                    : "Unknown"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-(--admin-line) bg-white/80 p-4 text-xs text-(--admin-muted)">
              <p>
                Target: <span className="font-semibold text-(--admin-ink)">{websiteProbe.targetUrl}</span>
              </p>
              <p className="mt-1">
                Final URL: <span className="font-semibold text-(--admin-ink)">{websiteProbe.finalUrl}</span>
              </p>
              <p className="mt-1">
                Content-Type: <span className="font-semibold text-(--admin-ink)">{websiteProbe.contentType || "Unknown"}</span>
              </p>
              <p className="mt-1">
                Last Check: <span className="font-semibold text-(--admin-ink)">{new Date(websiteProbe.checkedAt).toLocaleString()}</span>
              </p>
              {websiteProbe.title ? (
                <p className="mt-1">
                  Page Title: <span className="font-semibold text-(--admin-ink)">{websiteProbe.title}</span>
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  <p className="text-sm font-semibold text-(--admin-ink)">Page Metrics</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-(--admin-muted)">
                  <p>Links: <span className="font-semibold text-(--admin-ink)">{websiteProbe.contentMetrics.links}</span></p>
                  <p>Images: <span className="font-semibold text-(--admin-ink)">{websiteProbe.contentMetrics.images}</span></p>
                  <p>Scripts: <span className="font-semibold text-(--admin-ink)">{websiteProbe.contentMetrics.scripts}</span></p>
                  <p>Forms: <span className="font-semibold text-(--admin-ink)">{websiteProbe.contentMetrics.forms}</span></p>
                  <p>Headings: <span className="font-semibold text-(--admin-ink)">{websiteProbe.contentMetrics.headings}</span></p>
                </div>
              </div>

              <div className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <p className="text-sm font-semibold text-(--admin-ink)">Security Headers</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-(--admin-muted)">
                  <p>HSTS: <span className="font-semibold text-(--admin-ink)">{websiteProbe.securityHeaders.strictTransportSecurity ? "Yes" : "No"}</span></p>
                  <p>CSP: <span className="font-semibold text-(--admin-ink)">{websiteProbe.securityHeaders.contentSecurityPolicy ? "Yes" : "No"}</span></p>
                  <p>X-CTO: <span className="font-semibold text-(--admin-ink)">{websiteProbe.securityHeaders.xContentTypeOptions ? "Yes" : "No"}</span></p>
                  <p>X-Frame: <span className="font-semibold text-(--admin-ink)">{websiteProbe.securityHeaders.xFrameOptions ? "Yes" : "No"}</span></p>
                  <p>Referrer Policy: <span className="font-semibold text-(--admin-ink)">{websiteProbe.securityHeaders.referrerPolicy ? "Yes" : "No"}</span></p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
              <p className="text-sm font-semibold text-(--admin-ink)">/metrics Endpoint Discovery</p>
              <p className="mt-2 text-xs text-(--admin-muted)">
                Endpoint: <span className="font-semibold text-(--admin-ink)">{websiteProbe.metricsEndpoint.endpoint}</span>
              </p>
              <p className="mt-1 text-xs text-(--admin-muted)">
                Status: <span className="font-semibold text-(--admin-ink)">{websiteProbe.metricsEndpoint.available ? "Available" : "Not available"}</span>
                {typeof websiteProbe.metricsEndpoint.statusCode === "number" ? ` (${websiteProbe.metricsEndpoint.statusCode})` : ""}
              </p>
              {typeof websiteProbe.metricsEndpoint.metricCount === "number" ? (
                <p className="mt-1 text-xs text-(--admin-muted)">
                  Parsed Metrics: <span className="font-semibold text-(--admin-ink)">{websiteProbe.metricsEndpoint.metricCount}</span>
                </p>
              ) : null}
              {websiteProbe.metricsEndpoint.sampleMetricNames && websiteProbe.metricsEndpoint.sampleMetricNames.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {websiteProbe.metricsEndpoint.sampleMetricNames.map((metricName) => (
                    <span
                      key={metricName}
                      className="rounded-full border border-(--admin-line) px-2 py-1 text-[11px] font-semibold text-(--admin-muted)"
                    >
                      {metricName}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="admin-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                <h4 className="admin-title text-lg">Query output</h4>
              </div>
              <p className="mt-2 text-sm text-(--admin-muted)">{selectedQuery?.description ?? ""}</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="w-64 rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
                value={queryKey}
                onChange={(event) => setQueryKey(event.target.value)}
                disabled={loadingQueries}
              >
                {queries.map((query) => (
                  <option key={query.id} value={query.key}>
                    {query.label} ({query.key})
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  void loadQueryResult();
                }}
                className="rounded-full border border-(--admin-line) bg-white px-3 py-2 text-xs font-semibold"
                disabled={runningQuery}
              >
                {runningQuery ? "Running..." : "Run"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 grid place-items-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--admin-ink) border-t-transparent" />
            </div>
          ) : series.length === 0 ? (
            <p className="mt-6 text-sm text-(--admin-muted)">No data returned for this query.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {series.slice(0, 10).map((entry, idx) => (
                <div
                  key={`${entry.metric?.instance ?? "metric"}-${idx}`}
                  className="rounded-2xl border border-(--admin-line) bg-white/80 p-3"
                >
                  <p className="text-xs uppercase tracking-widest text-(--admin-muted)">Series {idx + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-(--admin-ink)">
                    {entry.metric?.job ?? entry.metric?.instance ?? "metric"}
                  </p>
                  <p className="mt-1 text-xs text-(--admin-muted)">Value: {entry.value?.[1] ?? "n/a"}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-(--admin-line) bg-white/80 p-4 text-xs text-(--admin-muted)">
            Query key: {data?.queryName ?? queryKey} | Source: {selectedQuery?.source ?? "builtin"}
          </div>
        </div>

        <div className="admin-panel p-6">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h4 className="admin-title text-lg">{form.id ? "Edit query" : "Add query"}</h4>
          </div>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              placeholder="Query key"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.key}
              onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
            />
            <input
              type="text"
              placeholder="Label"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.label}
              onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
            />
            <textarea
              placeholder="Description"
              className="min-h-18 w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <textarea
              placeholder="PromQL"
              className="min-h-28 w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.promQl}
              onChange={(event) => setForm((prev) => ({ ...prev, promQl: event.target.value }))}
            />
            <label className="flex items-center gap-2 text-xs font-semibold text-(--admin-muted)">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
              />
              Enabled
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => {
                void saveQuery();
              }}
              className="rounded-full border border-(--admin-ink) bg-(--admin-ink) px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving..." : form.id ? "Update Query" : "Create Query"}
            </button>
            <button
              onClick={resetForm}
              className="rounded-full border border-(--admin-line) bg-white px-4 py-2 text-xs font-semibold"
              disabled={saving}
            >
              Clear
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {queries.filter((entry) => entry.source === "custom").map((entry) => (
              <div key={entry.id} className="rounded-xl border border-(--admin-line) bg-white/80 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-(--admin-ink)">{entry.key}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(entry)}
                      className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-2 py-1 text-[11px] font-semibold"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        void deleteQuery(entry.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-2 py-1 text-[11px] font-semibold"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {queries.filter((entry) => entry.source === "custom").length === 0 ? (
              <p className="text-xs text-(--admin-muted)">No custom queries yet.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="admin-panel p-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h4 className="admin-title text-lg">Query governance</h4>
        </div>
        <p className="mt-2 text-sm text-(--admin-muted)">
          Built-in queries stay available by default. Custom queries are managed from this page and used by reports and data fetch jobs.
        </p>
      </section>
    </div>
  );
}
