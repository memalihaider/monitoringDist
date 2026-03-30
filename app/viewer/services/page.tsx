"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { RefreshCw, Search, Server } from "lucide-react";

type ServiceEntry = {
  id: string;
  source: "manual" | "prometheus";
  serviceKey: string;
  name: string;
  ownerTeam: string;
  status: "Running" | "Stopped" | "Unknown";
};

type ServicesResponse = {
  services?: ServiceEntry[];
  error?: string;
};

export default function ViewerServicesPage() {
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [search, setSearch] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/api/services");
      const data = (await response.json()) as ServicesResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load services");
      }

      setServices(data.services ?? []);
      setError(null);
    } catch (err) {
      const nextMessage = err instanceof Error ? err.message : "Failed to load services";
      setError(nextMessage);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
    const interval = setInterval(loadServices, 30000);
    return () => clearInterval(interval);
  }, [loadServices]);

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
            <h3 className="admin-title text-2xl">Service inventory</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Read-only snapshot of monitored services with ownership metadata.
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--admin-muted)" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search services..."
              className="w-64 rounded-full border border-(--admin-line) bg-white px-9 py-2 text-xs"
            />
          </div>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </section>

      <section className="admin-panel p-6">
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
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-(--admin-line) bg-white/80 p-4"
              >
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
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-(--admin-line) px-2 py-1 text-[11px] font-semibold uppercase">
                    {service.source}
                  </span>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                      service.status === "Running"
                        ? "border-[rgba(124,156,141,0.5)] bg-[rgba(124,156,141,0.18)]"
                        : service.status === "Stopped"
                          ? "border-[rgba(201,139,79,0.6)] bg-[rgba(201,139,79,0.18)]"
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
                  <button
                    onClick={() => void loadServices()}
                    className="inline-flex items-center gap-2 rounded-full border border-(--admin-line) bg-white px-3 py-1 text-xs font-semibold"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
