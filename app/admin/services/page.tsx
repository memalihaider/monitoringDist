"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { Activity, Pencil, Plus, RefreshCw, Search, Server, Trash2 } from "lucide-react";

type ServiceEntry = {
  id: string;
  source: "manual" | "prometheus";
  serviceKey: string;
  name: string;
  description: string;
  ownerTeam: string;
  environment: string;
  runbookUrl: string;
  dashboardUrl: string;
  statusNote: string;
  status: "Running" | "Stopped" | "Unknown";
  enabled: boolean;
  updatedAt: string;
};

type ServicesResponse = {
  services?: ServiceEntry[];
  manualCount?: number;
  autoCount?: number;
  canDelete?: boolean;
  error?: string;
};

type ServiceForm = {
  id: string;
  serviceKey: string;
  name: string;
  description: string;
  ownerTeam: string;
  environment: string;
  runbookUrl: string;
  dashboardUrl: string;
  statusNote: string;
  enabled: boolean;
};

const EMPTY_FORM: ServiceForm = {
  id: "",
  serviceKey: "",
  name: "",
  description: "",
  ownerTeam: "",
  environment: "",
  runbookUrl: "",
  dashboardUrl: "",
  statusNote: "",
  enabled: true,
};

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [search, setSearch] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manualCount, setManualCount] = useState(0);
  const [autoCount, setAutoCount] = useState(0);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setIsFetching(true);
    setError(null);

    try {
      const response = await authenticatedFetch("/api/admin/services");
      const result = (await response.json()) as ServicesResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load services");
      }

      setServices(result.services ?? []);
      setManualCount(result.manualCount ?? 0);
      setAutoCount(result.autoCount ?? 0);
      setCanDelete(result.canDelete === true);
    } catch (err) {
      const nextMessage = err instanceof Error ? err.message : "Failed to load services";
      setError(nextMessage);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
    const interval = setInterval(loadServices, 45000);
    return () => clearInterval(interval);
  }, [loadServices]);

  function startEdit(service: ServiceEntry) {
    setForm({
      id: service.id,
      serviceKey: service.serviceKey,
      name: service.name,
      description: service.description,
      ownerTeam: service.ownerTeam,
      environment: service.environment,
      runbookUrl: service.runbookUrl,
      dashboardUrl: service.dashboardUrl,
      statusNote: service.statusNote,
      enabled: service.enabled,
    });
    setMessage(`Editing ${service.name}`);
    setError(null);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  async function saveService() {
    if (!form.name.trim()) {
      setError("Service name is required");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        id: form.id,
        serviceKey: form.serviceKey,
        name: form.name,
        description: form.description,
        ownerTeam: form.ownerTeam,
        environment: form.environment,
        runbookUrl: form.runbookUrl,
        dashboardUrl: form.dashboardUrl,
        statusNote: form.statusNote,
        enabled: form.enabled,
      };

      const response = await authenticatedFetch("/api/admin/services", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save service");
      }

      setMessage(form.id ? "Service updated" : "Service created");
      resetForm();
      await loadServices();
    } catch (err) {
      const nextMessage = err instanceof Error ? err.message : "Failed to save service";
      setError(nextMessage);
    } finally {
      setSaving(false);
    }
  }

  async function deleteService(id: string) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch(`/api/admin/services?id=${id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to delete service");
      }

      if (form.id === id) {
        resetForm();
      }

      setMessage("Service deleted");
      await loadServices();
    } catch (err) {
      const nextMessage = err instanceof Error ? err.message : "Failed to delete service";
      setError(nextMessage);
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return services;
    }
    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(q) ||
        service.serviceKey.toLowerCase().includes(q) ||
        service.ownerTeam.toLowerCase().includes(q),
    );
  }, [search, services]);

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Service registry</p>
            <h3 className="admin-title text-2xl">Live service grid</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Register services manually and merge them with Prometheus auto-discovery.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="admin-chip">Manual: {manualCount}</span>
            <span className="admin-chip">Prometheus: {autoCount}</span>
            <span className="admin-chip">Total: {services.length}</span>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {!canDelete ? (
          <p className="mt-2 text-xs font-semibold text-(--admin-muted)">Delete actions are restricted to super-admin users.</p>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="admin-panel p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--admin-muted)" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search services..."
                className="w-72 rounded-full border border-(--admin-line) bg-white px-9 py-2 text-xs"
              />
            </div>
            <button
              onClick={() => void loadServices()}
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
          ) : filtered.length === 0 ? (
            <p className="text-sm text-(--admin-muted)">No services found.</p>
          ) : (
            <div className="grid gap-3">
              {filtered.map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl border border-(--admin-line) bg-white/80 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
                        <Server className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-(--admin-ink)">{service.name}</p>
                        <p className="text-xs text-(--admin-muted)">
                          {service.serviceKey} {service.ownerTeam ? `• ${service.ownerTeam}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-(--admin-line) px-2 py-1 text-[11px] font-semibold uppercase">
                        {service.source}
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                          service.status === "Running"
                            ? "border-[rgba(28,140,112,0.5)] bg-[rgba(28,140,112,0.12)]"
                            : service.status === "Stopped"
                              ? "border-[rgba(240,164,60,0.6)] bg-[rgba(240,164,60,0.16)]"
                              : "border-(--admin-line) bg-[rgba(20,21,21,0.06)]"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            service.status === "Running"
                              ? "bg-(--admin-accent)"
                              : service.status === "Stopped"
                                ? "bg-(--admin-accent-2)"
                                : "bg-(--admin-muted)"
                          }`}
                        />
                        {service.status}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-(--admin-muted)">
                    {service.description || "No service description"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-(--admin-muted)">
                      Updated: {service.updatedAt ? new Date(service.updatedAt).toLocaleString() : "-"}
                    </span>
                    {service.source === "manual" ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(service)}
                          className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-3 py-1 font-semibold"
                          disabled={saving}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        {canDelete ? (
                          <button
                            onClick={() => void deleteService(service.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-3 py-1 font-semibold"
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
                    ) : (
                      <span className="rounded-full border border-(--admin-line) px-2 py-1 font-semibold text-(--admin-muted)">
                        Auto discovered
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-panel p-6">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h4 className="admin-title text-lg">{form.id ? "Edit service" : "Add service"}</h4>
          </div>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              placeholder="Service key (optional, auto-generated from name)"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.serviceKey}
              onChange={(event) => setForm((prev) => ({ ...prev, serviceKey: event.target.value }))}
            />
            <input
              type="text"
              placeholder="Service name"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <textarea
              placeholder="Description"
              className="min-h-20 w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <input
              type="text"
              placeholder="Owner team"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.ownerTeam}
              onChange={(event) => setForm((prev) => ({ ...prev, ownerTeam: event.target.value }))}
            />
            <input
              type="text"
              placeholder="Environment (prod/stage/dev)"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.environment}
              onChange={(event) => setForm((prev) => ({ ...prev, environment: event.target.value }))}
            />
            <input
              type="url"
              placeholder="Runbook URL"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.runbookUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, runbookUrl: event.target.value }))}
            />
            <input
              type="url"
              placeholder="Dashboard URL"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.dashboardUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, dashboardUrl: event.target.value }))}
            />
            <textarea
              placeholder="Status note"
              className="min-h-18 w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
              value={form.statusNote}
              onChange={(event) => setForm((prev) => ({ ...prev, statusNote: event.target.value }))}
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
                void saveService();
              }}
              className="rounded-full border border-(--admin-ink) bg-(--admin-ink) px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving..." : form.id ? "Update Service" : "Create Service"}
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

      <section className="admin-panel p-6">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5" />
          <div>
            <h4 className="admin-title text-lg">Service pulse</h4>
            <p className="text-sm text-(--admin-muted)">
              Prometheus jobs are auto-discovered while manual services provide ownership metadata.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
