"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, Search, Server } from "lucide-react";

type ServiceEntry = {
  id: string;
  name: string;
  status: "Running" | "Stopped";
};

type PrometheusVectorResult = {
  metric: Record<string, string>;
  value: [number, string];
};

type PrometheusQueryResponse = {
  data?: {
    result?: PrometheusVectorResult[];
  };
};

export default function OperatorServicesPage() {
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [search, setSearch] = useState("");
  const [isFetching, setIsFetching] = useState(true);

  const loadServices = useCallback(async () => {
    try {
      const res = await fetch("/api/prometheus/query?q=min_up_by_job");
      const data = (await res.json()) as PrometheusQueryResponse;
      const results = data.data?.result || [];

      const svc: ServiceEntry[] = results.map((entry, idx) => ({
        id: entry.metric.job || `unknown-${idx}`,
        name: entry.metric.instance || "Unknown Instance",
        status: entry.value[1] === "1" ? "Running" : "Stopped",
      }));

      setServices(svc);
    } catch (err) {
      console.error("Failed to load services", err);
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
    return services.filter((service) => service.id.toLowerCase().includes(q) || service.name.toLowerCase().includes(q));
  }, [search, services]);

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Service registry</p>
            <h3 className="admin-title text-2xl">Live service grid</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Monitor service uptime, update status, and review runtime health.
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
                    <p className="text-sm font-semibold text-(--admin-ink)">{service.id}</p>
                    <p className="text-xs text-(--admin-muted)">{service.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                      service.status === "Running"
                        ? "border-[rgba(14,139,124,0.5)] bg-[rgba(14,139,124,0.12)]"
                        : "border-[rgba(240,138,36,0.6)] bg-[rgba(240,138,36,0.16)]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        service.status === "Running" ? "bg-(--admin-accent)" : "bg-(--admin-accent-2)"
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

      <section className="admin-panel p-6">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5" />
          <div>
            <h4 className="admin-title text-lg">Service pulse</h4>
            <p className="text-sm text-(--admin-muted)">Data is refreshed every 30 seconds from Prometheus.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
