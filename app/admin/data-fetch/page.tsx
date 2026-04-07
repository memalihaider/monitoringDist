"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import Link from "next/link";
import { Database, Play, RefreshCw } from "lucide-react";

type QueryRecord = {
  id: string;
  key: string;
  label: string;
};

type FetchJob = {
  id: string;
  source: string;
  queryKey: string;
  projectId: string;
  projectName: string;
  collectionName: string;
  status: string;
  resultCount: number;
  preview: string;
  error: string;
  createdAt: string;
  createdBy: string;
};

type JobsResponse = {
  jobs?: FetchJob[];
  error?: string;
};

type QueryResponse = {
  queries?: QueryRecord[];
};

type MonitoringProject = {
  id: string;
  name: string;
  prometheusQuery: string;
};

type ProjectsResponse = {
  projects?: MonitoringProject[];
};

const COLLECTION_OPTIONS = [
  "admin_services",
  "admin_docs",
  "admin_reports",
  "admin_audit_events",
  "admin_prometheus_queries",
  "alert_acknowledgements",
  "doc_notes",
  "user_roles",
] as const;

export default function AdminDataFetchPage() {
  const [jobs, setJobs] = useState<FetchJob[]>([]);
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [source, setSource] = useState<"prometheus" | "firestore">("prometheus");
  const [queryKey, setQueryKey] = useState("up");
  const [projects, setProjects] = useState<MonitoringProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [collectionName, setCollectionName] = useState<(typeof COLLECTION_OPTIONS)[number]>("admin_services");
  const [limit, setLimit] = useState(25);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [jobsResponse, queriesResponse, projectsResponse] = await Promise.all([
        authenticatedFetch("/api/admin/data-fetch"),
        authenticatedFetch("/api/admin/prometheus"),
        authenticatedFetch("/api/admin/monitoring-projects"),
      ]);

      const jobsResult = (await jobsResponse.json()) as JobsResponse;
      const queryResult = (await queriesResponse.json()) as QueryResponse;
      const projectsResult = (await projectsResponse.json()) as ProjectsResponse;

      if (!jobsResponse.ok) {
        throw new Error(jobsResult.error ?? "Failed to load data fetch history");
      }

      const nextJobs = jobsResult.jobs ?? [];
      setJobs(nextJobs);
      setQueries(queryResult.queries ?? []);
      setProjects(projectsResult.projects ?? []);

      if ((queryResult.queries ?? []).length > 0 && !(queryResult.queries ?? []).some((item) => item.key === queryKey)) {
        setQueryKey((queryResult.queries ?? [])[0].key);
      }

      if (nextJobs.length > 0 && !selectedJobId) {
        setSelectedJobId(nextJobs[0].id);
      }
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to load data fetch history";
      setError(nextMessage);
    } finally {
      setLoading(false);
    }
  }, [queryKey, selectedJobId]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  async function runFetch() {
    setRunning(true);
    setError(null);
    setMessage(null);

    try {
      const payload =
        source === "prometheus"
          ? { source, queryKey, projectId: selectedProjectId || undefined }
          : { source, collectionName, limit: Number.isFinite(limit) ? limit : 25 };

      const response = await authenticatedFetch("/api/admin/data-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string; job?: FetchJob };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to run data fetch");
      }

      setMessage("Data fetch completed");
      await loadPageData();
      if (result.job?.id) {
        setSelectedJobId(result.job.id);
      }
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to run data fetch";
      setError(nextMessage);
    } finally {
      setRunning(false);
    }
  }

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null,
    [jobs, selectedJobId],
  );

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Data operations</p>
            <h3 className="admin-title text-2xl">Data Fetch Console</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Run one-click fetch jobs from Prometheus or Firestore and inspect results.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="admin-chip">Jobs: {jobs.length}</span>
            <span className="admin-chip">Prometheus queries: {queries.length}</span>
            <span className="admin-chip">Projects: {projects.length}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link href="/admin/projects" className="rounded-full border border-(--admin-line) bg-white px-3 py-1.5 font-semibold">
            Open Projects
          </Link>
          <Link href="/admin/prometheus" className="rounded-full border border-(--admin-line) bg-white px-3 py-1.5 font-semibold">
            Open Prometheus
          </Link>
          <Link href="/admin/reports" className="rounded-full border border-(--admin-line) bg-white px-3 py-1.5 font-semibold">
            Open Reports
          </Link>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
        <div className="admin-panel p-6">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <h4 className="admin-title text-lg">Run fetch job</h4>
          </div>

          <div className="mt-4 space-y-3">
            <select
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={source}
              onChange={(event) => setSource(event.target.value as "prometheus" | "firestore")}
            >
              <option value="prometheus">Prometheus</option>
              <option value="firestore">Firestore</option>
            </select>

            {source === "prometheus" ? (
              <>
                <select
                  className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
                  value={selectedProjectId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedProjectId(value);
                    const selectedProject = projects.find((project) => project.id === value);
                    if (selectedProject?.prometheusQuery) {
                      setQueryKey(selectedProject.prometheusQuery);
                    }
                  }}
                >
                  <option value="">No project selected</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
                  value={queryKey}
                  onChange={(event) => setQueryKey(event.target.value)}
                >
                  {queries.map((query) => (
                    <option key={query.id} value={query.key}>
                      {query.label} ({query.key})
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <select
                  className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
                  value={collectionName}
                  onChange={(event) => setCollectionName(event.target.value as (typeof COLLECTION_OPTIONS)[number])}
                >
                  {COLLECTION_OPTIONS.map((collection) => (
                    <option key={collection} value={collection}>
                      {collection}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
                  min={1}
                  max={200}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                  placeholder="Limit"
                />
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => {
                void runFetch();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-(--admin-ink) bg-(--admin-ink) px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              disabled={running}
            >
              <Play className="h-4 w-4" />
              {running ? "Running..." : "Run Fetch"}
            </button>
            <button
              onClick={() => {
                void loadPageData();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-(--admin-line) bg-white px-4 py-2 text-xs font-semibold"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="admin-panel p-6">
          <h4 className="admin-title text-lg">Job history</h4>

          {loading ? (
            <div className="mt-6 grid place-items-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--admin-ink) border-t-transparent" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="mt-4 text-sm text-(--admin-muted)">No data fetch jobs yet.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`rounded-2xl border p-3 text-left ${
                    selectedJob?.id === job.id
                      ? "border-(--admin-ink) bg-white"
                      : "border-(--admin-line) bg-white/80"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold uppercase">{job.source}</span>
                    <span className="text-(--admin-muted)">{job.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-(--admin-muted)">
                    {job.queryKey ? `q=${job.queryKey}` : `collection=${job.collectionName}`}
                  </p>
                  {job.projectName ? (
                    <p className="mt-1 text-xs font-semibold text-(--admin-ink)">Project: {job.projectName}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-(--admin-muted)">
                    Rows: {job.resultCount} • {job.createdAt ? new Date(job.createdAt).toLocaleString() : "-"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="admin-panel p-6">
        <h4 className="admin-title text-lg">Selected job preview</h4>
        {!selectedJob ? (
          <p className="mt-3 text-sm text-(--admin-muted)">Select a job to inspect preview output.</p>
        ) : (
          <>
            <p className="mt-2 text-xs text-(--admin-muted)">
              Job {selectedJob.id} • {selectedJob.source} • {selectedJob.resultCount} rows
            </p>
            {selectedJob.projectName ? (
              <p className="mt-1 text-xs font-semibold text-(--admin-ink)">Project: {selectedJob.projectName}</p>
            ) : null}
            <pre className="mt-3 max-h-90 overflow-auto rounded-2xl border border-(--admin-line) bg-white p-4 text-xs text-(--admin-ink)">
              {selectedJob.preview || selectedJob.error || "No preview available"}
            </pre>
          </>
        )}
      </section>
    </div>
  );
}
