"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import Link from "next/link";
import { FolderKanban, Globe, Pencil, Plus, Radar, RefreshCw, Trash2 } from "lucide-react";

type MonitoringProject = {
  id: string;
  name: string;
  description: string;
  systemType: string;
  targetUrl: string;
  prometheusQuery: string;
  expectedMetrics: string[];
  enabled: boolean;
  lastProbeStatus: "up" | "down" | "unknown";
  lastProbeAt: string;
  lastProbeLatencyMs: number | null;
  updatedAt: string;
};

type MonitoringProjectsResponse = {
  projects?: MonitoringProject[];
  canDelete?: boolean;
  error?: string;
};

type ProjectForm = {
  id: string;
  name: string;
  description: string;
  systemType: string;
  targetUrl: string;
  prometheusQuery: string;
  expectedMetrics: string;
  enabled: boolean;
};

const EMPTY_FORM: ProjectForm = {
  id: "",
  name: "",
  description: "",
  systemType: "website",
  targetUrl: "",
  prometheusQuery: "",
  expectedMetrics: "up,min_up_by_job,scrape_duration_by_job",
  enabled: true,
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<MonitoringProject[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeProbeId, setActiveProbeId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsFetching(true);
    setError(null);

    try {
      const response = await authenticatedFetch("/api/admin/monitoring-projects");
      const result = (await response.json()) as MonitoringProjectsResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load monitoring projects");
      }

      setProjects(result.projects ?? []);
      setCanDelete(result.canDelete === true);
    } catch (nextError) {
      const nextMessage =
        nextError instanceof Error ? nextError.message : "Failed to load monitoring projects";
      setError(nextMessage);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  function startEdit(project: MonitoringProject) {
    setForm({
      id: project.id,
      name: project.name,
      description: project.description,
      systemType: project.systemType,
      targetUrl: project.targetUrl,
      prometheusQuery: project.prometheusQuery,
      expectedMetrics: project.expectedMetrics.join(","),
      enabled: project.enabled,
    });
    setMessage(`Editing ${project.name}`);
    setError(null);
  }

  async function saveProject() {
    if (!form.name.trim()) {
      setError("Project name is required");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        id: form.id,
        name: form.name,
        description: form.description,
        systemType: form.systemType,
        targetUrl: form.targetUrl,
        prometheusQuery: form.prometheusQuery,
        expectedMetrics: form.expectedMetrics
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
        enabled: form.enabled,
      };

      const response = await authenticatedFetch("/api/admin/monitoring-projects", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save monitoring project");
      }

      setMessage(form.id ? "Project updated" : "Project created");
      resetForm();
      await loadProjects();
    } catch (nextError) {
      const nextMessage =
        nextError instanceof Error ? nextError.message : "Failed to save monitoring project";
      setError(nextMessage);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(id: string) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch(`/api/admin/monitoring-projects?id=${id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to delete monitoring project");
      }

      if (form.id === id) {
        resetForm();
      }

      setMessage("Project deleted");
      await loadProjects();
    } catch (nextError) {
      const nextMessage =
        nextError instanceof Error ? nextError.message : "Failed to delete monitoring project";
      setError(nextMessage);
    } finally {
      setSaving(false);
    }
  }

  async function runWebsiteProbe(project: MonitoringProject) {
    if (!project.targetUrl) {
      setError("Set target URL before running website probe");
      return;
    }

    setActiveProbeId(project.id);
    setError(null);
    setMessage(null);

    try {
      const probeResponse = await authenticatedFetch(
        `/api/prometheus/website?url=${encodeURIComponent(project.targetUrl)}`,
      );
      const probeResult = (await probeResponse.json()) as {
        available?: boolean;
        responseTimeMs?: number;
        checkedAt?: string;
        error?: string;
      };

      if (!probeResponse.ok) {
        throw new Error(probeResult.error ?? "Website probe failed");
      }

      const updateResponse = await authenticatedFetch("/api/admin/monitoring-projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: project.id,
          name: project.name,
          description: project.description,
          systemType: project.systemType,
          targetUrl: project.targetUrl,
          prometheusQuery: project.prometheusQuery,
          expectedMetrics: project.expectedMetrics,
          enabled: project.enabled,
          lastProbeStatus: probeResult.available ? "up" : "down",
          lastProbeAt: probeResult.checkedAt ?? new Date().toISOString(),
          lastProbeLatencyMs:
            typeof probeResult.responseTimeMs === "number" ? probeResult.responseTimeMs : null,
        }),
      });

      const updateResult = (await updateResponse.json()) as { error?: string };
      if (!updateResponse.ok) {
        throw new Error(updateResult.error ?? "Failed to save probe status");
      }

      setMessage(`Probe complete for ${project.name}`);
      await loadProjects();
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Website probe failed";
      setError(nextMessage);
    } finally {
      setActiveProbeId(null);
    }
  }

  const stats = useMemo(() => {
    const total = projects.length;
    const enabled = projects.filter((project) => project.enabled).length;
    const up = projects.filter((project) => project.lastProbeStatus === "up").length;
    const down = projects.filter((project) => project.lastProbeStatus === "down").length;
    return { total, enabled, up, down };
  }, [projects]);

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Project monitoring</p>
            <h3 className="admin-title text-2xl">Cross-system monitoring projects</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Create projects for websites and external systems, assign Prometheus metrics, and keep probe status per project.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="admin-chip">Total: {stats.total}</span>
            <span className="admin-chip">Enabled: {stats.enabled}</span>
            <span className="admin-chip">Up: {stats.up}</span>
            <span className="admin-chip">Down: {stats.down}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link href="/admin/prometheus" className="rounded-full border border-(--admin-line) bg-white px-3 py-1.5 font-semibold">
            Open Prometheus
          </Link>
          <Link href="/admin/data-fetch" className="rounded-full border border-(--admin-line) bg-white px-3 py-1.5 font-semibold">
            Open Data Fetch
          </Link>
          <Link href="/admin/reports" className="rounded-full border border-(--admin-line) bg-white px-3 py-1.5 font-semibold">
            Open Reports
          </Link>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {!canDelete ? (
          <p className="mt-2 text-xs font-semibold text-(--admin-muted)">
            Delete actions are restricted to super-admin users.
          </p>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="admin-panel p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              <h4 className="admin-title text-lg">Projects list</h4>
            </div>
            <button
              onClick={() => {
                void loadProjects();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-(--admin-line) bg-white px-3 py-1.5 text-xs font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {isFetching ? (
            <div className="grid place-items-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--admin-ink) border-t-transparent" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-(--admin-muted)">No monitoring projects yet.</p>
          ) : (
            <div className="grid gap-3">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-2xl border border-(--admin-line) bg-white/80 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
                        {project.systemType === "website" ? (
                          <Globe className="h-5 w-5" />
                        ) : (
                          <Radar className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-(--admin-ink)">{project.name}</p>
                        <p className="text-xs text-(--admin-muted)">
                          {project.systemType} {project.targetUrl ? `• ${project.targetUrl}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-(--admin-line) px-2 py-1 text-[11px] font-semibold uppercase">
                        {project.enabled ? "enabled" : "disabled"}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
                          project.lastProbeStatus === "up"
                            ? "border-[rgba(28,140,112,0.5)] bg-[rgba(28,140,112,0.12)]"
                            : project.lastProbeStatus === "down"
                              ? "border-[rgba(190,65,65,0.5)] bg-[rgba(190,65,65,0.12)]"
                              : "border-(--admin-line) bg-[rgba(20,21,21,0.06)]"
                        }`}
                      >
                        {project.lastProbeStatus}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-(--admin-muted)">{project.description || "No description"}</p>
                  <p className="mt-2 text-xs text-(--admin-muted)">
                    Expected metrics: {project.expectedMetrics.length > 0 ? project.expectedMetrics.join(", ") : "-"}
                  </p>
                  <p className="mt-1 text-xs text-(--admin-muted)">
                    Prometheus query: {project.prometheusQuery || "-"}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-(--admin-muted)">
                      Last probe: {project.lastProbeAt ? new Date(project.lastProbeAt).toLocaleString() : "Never"}
                      {typeof project.lastProbeLatencyMs === "number"
                        ? ` • ${project.lastProbeLatencyMs} ms`
                        : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(project)}
                        className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-3 py-1 font-semibold"
                        disabled={saving}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          void runWebsiteProbe(project);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-3 py-1 font-semibold"
                        disabled={activeProbeId === project.id || !project.targetUrl}
                      >
                        <Radar className="h-3.5 w-3.5" />
                        {activeProbeId === project.id ? "Probing..." : "Probe"}
                      </button>
                      {canDelete ? (
                        <button
                          onClick={() => {
                            void deleteProject(project.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-3 py-1 font-semibold"
                          disabled={saving}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="admin-panel p-6">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h4 className="admin-title text-lg">{form.id ? "Edit project" : "Add project"}</h4>
          </div>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              placeholder="Project name"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <textarea
              placeholder="Description"
              className="min-h-18 w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <select
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.systemType}
              onChange={(event) => setForm((prev) => ({ ...prev, systemType: event.target.value }))}
            >
              <option value="website">Website</option>
              <option value="api">API</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="database">Database</option>
              <option value="custom">Custom</option>
            </select>
            <input
              type="url"
              placeholder="Target URL (for website probe)"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.targetUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, targetUrl: event.target.value }))}
            />
            <input
              type="text"
              placeholder="Primary Prometheus query"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.prometheusQuery}
              onChange={(event) => setForm((prev) => ({ ...prev, prometheusQuery: event.target.value }))}
            />
            <textarea
              placeholder="Expected metrics (comma separated)"
              className="min-h-20 w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.expectedMetrics}
              onChange={(event) => setForm((prev) => ({ ...prev, expectedMetrics: event.target.value }))}
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
                void saveProject();
              }}
              className="rounded-full border border-(--admin-ink) bg-(--admin-ink) px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving..." : form.id ? "Update Project" : "Create Project"}
            </button>
            <button
              onClick={resetForm}
              className="rounded-full border border-(--admin-line) bg-white px-4 py-2 text-xs font-semibold"
              disabled={saving}
            >
              Clear
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
