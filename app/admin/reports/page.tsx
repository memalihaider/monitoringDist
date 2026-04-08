"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { buildCsvTable, buildJsonPayload, buildReportPdf, downloadBlob, safeReportFilename } from "@/lib/reports/export";
import Link from "next/link";
import { Calendar, Download, FileText, Filter, Play, Plus, Trash2 } from "lucide-react";

type ReportFormat = "csv" | "json" | "summary";
type ReportSource = "manual" | "prometheus";

type ReportEntry = {
  id: string;
  title: string;
  description: string;
  format: ReportFormat;
  sourceType: ReportSource;
  queryKey: string;
  projectId: string;
  projectName: string;
  content: string;
  status: "draft" | "ready";
  generatedAt: string;
  generatedPreview: string;
  updatedAt: string;
};

type ReportsResponse = {
  reports?: ReportEntry[];
  canDelete?: boolean;
  error?: string;
};

type MonitoringProject = {
  id: string;
  name: string;
};

type ProjectsResponse = {
  projects?: MonitoringProject[];
};

type ReportForm = {
  id: string;
  title: string;
  description: string;
  format: ReportFormat;
  sourceType: ReportSource;
  queryKey: string;
  projectId: string;
  projectName: string;
  content: string;
  status: "draft" | "ready";
};

const EMPTY_FORM: ReportForm = {
  id: "",
  title: "",
  description: "",
  format: "summary",
  sourceType: "manual",
  queryKey: "",
  projectId: "",
  projectName: "",
  content: "",
  status: "draft",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [projects, setProjects] = useState<MonitoringProject[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [formatFilter, setFormatFilter] = useState<"All" | "PDF" | "CSV">("All");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [form, setForm] = useState<ReportForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [reportsResponse, projectsResponse] = await Promise.all([
        authenticatedFetch("/api/admin/reports"),
        authenticatedFetch("/api/admin/monitoring-projects"),
      ]);

      const result = (await reportsResponse.json()) as ReportsResponse;
      const projectsResult = (await projectsResponse.json()) as ProjectsResponse;

      if (!reportsResponse.ok) {
        throw new Error(result.error ?? "Failed to load reports");
      }

      setReports(result.reports ?? []);
      setCanDelete(result.canDelete === true);
      setProjects(projectsResult.projects ?? []);
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to load reports";
      setError(nextMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  function startEdit(report: ReportEntry) {
    setForm({
      id: report.id,
      title: report.title,
      description: report.description,
      format: report.format,
      sourceType: report.sourceType,
      queryKey: report.queryKey,
      projectId: report.projectId,
      projectName: report.projectName,
      content: report.content,
      status: report.status,
    });
    setMessage(`Editing ${report.title}`);
    setError(null);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  async function saveReport() {
    if (!form.title.trim()) {
      setError("Report title is required");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch("/api/admin/reports", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save report");
      }

      setMessage(form.id ? "Report updated" : "Report created");
      resetForm();
      await loadReports();
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to save report";
      setError(nextMessage);
    } finally {
      setSaving(false);
    }
  }

  async function generateReport(id: string) {
    setRunningId(id);
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch("/api/admin/reports", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "generate" }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to generate report");
      }

      setMessage("Report generated");
      await loadReports();
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to generate report";
      setError(nextMessage);
    } finally {
      setRunningId(null);
    }
  }

  async function deleteReport(id: string) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch(`/api/admin/reports?id=${id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to delete report");
      }

      if (form.id === id) {
        resetForm();
      }

      setMessage("Report deleted");
      await loadReports();
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to delete report";
      setError(nextMessage);
    } finally {
      setSaving(false);
    }
  }

  async function downloadReport(report: ReportEntry, target: "csv" | "json" | "pdf") {
    setError(null);
    setMessage(null);

    try {
      const reportFileBase = safeReportFilename(report.title);

      if (target === "csv") {
        const csv = buildCsvTable(report);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        downloadBlob(blob, `${reportFileBase}.csv`);
        setMessage("CSV export downloaded");
        return;
      }

      if (target === "json") {
        const json = buildJsonPayload(report);
        const blob = new Blob([json], { type: "application/json;charset=utf-8" });
        downloadBlob(blob, `${reportFileBase}.json`);
        setMessage("JSON export downloaded");
        return;
      }

      const pdfBlob = await buildReportPdf(report);
      downloadBlob(pdfBlob, `${reportFileBase}.pdf`);
      setMessage("PDF export downloaded");
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to export report";
      setError(nextMessage);
    }
  }

  const visibleReports = useMemo(() => {
    let filtered = reports;

    if (projectFilter !== "all") {
      filtered = filtered.filter((report) => report.projectId === projectFilter);
    }

    if (formatFilter === "All") return filtered;
    if (formatFilter === "CSV") {
      return filtered.filter((report) => report.format === "csv");
    }
    return filtered.filter((report) => report.format !== "csv");
  }, [formatFilter, projectFilter, reports]);

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Reporting</p>
            <h3 className="admin-title text-2xl">Operational reports</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Create reports, generate snapshots, and export output for operations reviews.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="admin-chip">Total: {reports.length}</span>
            <span className="admin-chip">Ready: {reports.filter((entry) => entry.status === "ready").length}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link href="/admin/projects" className="rounded-full border border-(--admin-line) bg-white px-3 py-1.5 font-semibold">
            Open Projects
          </Link>
          <Link href="/admin/data-fetch" className="rounded-full border border-(--admin-line) bg-white px-3 py-1.5 font-semibold">
            Open Data Fetch
          </Link>
          <Link href="/admin/prometheus" className="rounded-full border border-(--admin-line) bg-white px-3 py-1.5 font-semibold">
            Open Prometheus
          </Link>
        </div>
          {!canDelete ? (
            <p className="mt-2 text-xs font-semibold text-(--admin-muted)">Delete actions are restricted to super-admin users.</p>
          ) : null}
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="admin-panel p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  setFormatFilter((current) =>
                    current === "All" ? "PDF" : current === "PDF" ? "CSV" : "All",
                  )
                }
                className="inline-flex items-center gap-2 rounded-full border border-(--admin-line) bg-white px-4 py-2 text-xs font-semibold"
              >
                <Filter className="h-4 w-4" />
                Format: {formatFilter}
              </button>
              <select
                className="rounded-full border border-(--admin-line) bg-white px-3 py-2 text-xs font-semibold"
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                void loadReports();
              }}
              className="rounded-full border border-(--admin-line) bg-white px-3 py-1.5 text-xs font-semibold"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="grid place-items-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--admin-ink) border-t-transparent" />
            </div>
          ) : visibleReports.length === 0 ? (
            <p className="text-sm text-(--admin-muted)">No reports found.</p>
          ) : (
            <div className="space-y-3">
              {visibleReports.map((report) => (
                <article key={report.id} className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-(--admin-ink)">{report.title}</p>
                        <p className="text-xs text-(--admin-muted)">
                          {report.description || "No description"}
                        </p>
                        {report.projectName ? (
                          <p className="mt-1 text-xs font-semibold text-(--admin-ink)">Project: {report.projectName}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          <span className="rounded-full border border-(--admin-line) px-2 py-0.5 uppercase">
                            {report.format}
                          </span>
                          <span className="rounded-full border border-(--admin-line) px-2 py-0.5 uppercase">
                            {report.sourceType}
                          </span>
                          <span className="rounded-full border border-(--admin-line) px-2 py-0.5 uppercase">
                            {report.status}
                          </span>
                          {report.projectName ? (
                            <span className="rounded-full border border-(--admin-line) px-2 py-0.5 uppercase">
                              project: {report.projectName}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => startEdit(report)}
                        className="rounded-full border border-(--admin-line) bg-white px-3 py-1 text-xs font-semibold"
                        disabled={saving}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          void generateReport(report.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-3 py-1 text-xs font-semibold"
                        disabled={runningId === report.id}
                      >
                        <Play className="h-3.5 w-3.5" />
                        {runningId === report.id ? "Generating..." : "Generate"}
                      </button>
                      <button
                        onClick={() => {
                          void downloadReport(report, "csv");
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-3 py-1 text-xs font-semibold"
                      >
                        <Download className="h-3.5 w-3.5" />
                        CSV
                      </button>
                      <button
                        onClick={() => {
                          void downloadReport(report, "pdf");
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-3 py-1 text-xs font-semibold"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </button>
                      {report.format === "json" ? (
                        <button
                          onClick={() => {
                            void downloadReport(report, "json");
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-3 py-1 text-xs font-semibold"
                        >
                          <Download className="h-3.5 w-3.5" />
                          JSON
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          onClick={() => {
                            void deleteReport(report.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-3 py-1 text-xs font-semibold"
                          disabled={saving}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      ) : (
                        <span className="rounded-full border border-(--admin-line) px-3 py-1 text-[11px] font-semibold text-(--admin-muted)">
                          Super-admin delete only
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-(--admin-muted)">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Updated: {report.updatedAt ? new Date(report.updatedAt).toLocaleString() : "-"}
                    </span>
                    <span>
                      Generated: {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : "Not yet"}
                    </span>
                  </div>
                  {report.generatedPreview ? (
                    <pre className="mt-3 max-h-28 overflow-auto rounded-xl border border-(--admin-line) bg-white p-3 text-[11px] text-(--admin-ink)">
                      {report.generatedPreview}
                    </pre>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="admin-panel p-6">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h4 className="admin-title text-lg">{form.id ? "Edit report" : "Create report"}</h4>
          </div>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              placeholder="Title"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            <textarea
              placeholder="Description"
              className="min-h-18 w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <select
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.sourceType}
              onChange={(event) => setForm((prev) => ({ ...prev, sourceType: event.target.value as ReportSource }))}
            >
              <option value="manual">Manual</option>
              <option value="prometheus">Prometheus</option>
            </select>
            <input
              type="text"
              placeholder="Query key (required for Prometheus reports)"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.queryKey}
              onChange={(event) => setForm((prev) => ({ ...prev, queryKey: event.target.value }))}
            />
            <select
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.projectId}
              onChange={(event) => {
                const selected = projects.find((project) => project.id === event.target.value);
                setForm((prev) => ({
                  ...prev,
                  projectId: event.target.value,
                  projectName: selected?.name ?? "",
                }));
              }}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.format}
              onChange={(event) => setForm((prev) => ({ ...prev, format: event.target.value as ReportFormat }))}
            >
              <option value="summary">Summary</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
            <textarea
              placeholder="Manual content"
              className="min-h-28 w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => {
                void saveReport();
              }}
              className="rounded-full border border-(--admin-ink) bg-(--admin-ink) px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving..." : form.id ? "Update Report" : "Create Report"}
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
