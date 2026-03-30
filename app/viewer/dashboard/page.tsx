"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { Activity, Cpu, Server, ShieldCheck } from "lucide-react";

type PrometheusVectorResult = {
  metric: Record<string, string>;
  value: [number, string];
};

type PrometheusQueryResponse = {
  data?: {
    result?: PrometheusVectorResult[];
  };
};

function toNumber(value: string | undefined) {
  if (!value) return 0;
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

export default function ViewerDashboardPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    servicesUp: 0,
    servicesDown: 0,
    avgCpuLoad: 0,
    activeAlerts: 0,
  });

  useEffect(() => {
    let active = true;

    async function fetchMetrics() {
      setError(null);
      setLoading(true);
      try {
        const [upRes, cpuRes, alertsRes] = await Promise.all([
          authenticatedFetch("/api/prometheus/query?q=min_up_by_job"),
          authenticatedFetch("/api/prometheus/query?q=cpu_load"),
          authenticatedFetch("/api/prometheus/query?q=alerts"),
        ]);

        if (!upRes.ok || !cpuRes.ok || !alertsRes.ok) {
          throw new Error("Failed to query telemetry");
        }

        const upData = (await upRes.json()) as PrometheusQueryResponse;
        const cpuData = (await cpuRes.json()) as PrometheusQueryResponse;
        const alertsData = (await alertsRes.json()) as PrometheusQueryResponse;

        const upResults = upData.data?.result ?? [];
        const cpuResults = cpuData.data?.result ?? [];
        const alertResults = alertsData.data?.result ?? [];

        const up = upResults.filter((row) => toNumber(row.value[1]) >= 1).length;
        const down = upResults.filter((row) => toNumber(row.value[1]) < 1).length;
        const avgCpuLoad = cpuResults.length > 0 ? toNumber(cpuResults[0].value[1]) : 0;

        if (active) {
          setMetrics({
            servicesUp: up,
            servicesDown: down,
            avgCpuLoad: Math.round(avgCpuLoad),
            activeAlerts: alertResults.length,
          });
        }
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "Failed to fetch metrics";
        if (active) {
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const cards = useMemo(
    () => [
      {
        title: "Services Online",
        value: loading ? "-" : metrics.servicesUp,
        icon: Server,
        tone: "bg-[rgba(124,156,141,0.2)]",
      },
      {
        title: "Services Offline",
        value: loading ? "-" : metrics.servicesDown,
        icon: ShieldCheck,
        tone: "bg-[rgba(201,139,79,0.18)]",
      },
      {
        title: "Active Alerts",
        value: loading ? "-" : metrics.activeAlerts,
        icon: Activity,
        tone: "bg-[rgba(201,139,79,0.12)]",
      },
      {
        title: "Avg CPU Load",
        value: loading ? "-" : `${metrics.avgCpuLoad}%`,
        icon: Cpu,
        tone: "bg-[rgba(108,140,196,0.18)]",
      },
    ],
    [loading, metrics],
  );

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Viewer pulse</p>
            <h3 className="admin-title text-2xl">Live service snapshot</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Read-only telemetry, alert counts, and service uptime checks.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="admin-chip">Refresh: 30s</span>
            <span className="admin-chip">Alerts: {metrics.activeAlerts}</span>
          </div>
        </div>
        {error ? <p className="mt-4 text-sm font-semibold text-red-700">{error}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, idx) => (
          <div
            key={card.title}
            className={`rounded-2xl border border-(--admin-line) bg-white/85 p-4 shadow-[0_12px_24px_rgba(20,21,21,0.12)] reveal-up ${
              idx === 1 ? "reveal-delay-1" : idx === 2 ? "reveal-delay-2" : idx === 3 ? "reveal-delay-3" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${card.tone}`}>
                <card.icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-4 text-xs uppercase tracking-widest text-(--admin-muted)">{card.title}</p>
            <p className="mt-2 text-3xl font-semibold text-(--admin-ink)">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="admin-panel p-6">
        <h4 className="admin-title text-lg">Viewer notes</h4>
        <p className="mt-2 text-sm text-(--admin-muted)">
          You have read-only access to alerts and services.
        </p>
      </section>
    </div>
  );
}
