"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

type AlertEntry = {
  id: string;
  alertname: string;
  severity: string;
  description: string;
  job: string;
  instance: string;
  time: string;
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

export default function ViewerAlertsPage() {
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchAlerts() {
      try {
        const res = await authenticatedFetch("/api/prometheus/query?q=alerts");
        const data = (await res.json()) as PrometheusQueryResponse;
        const results = data.data?.result || [];

        const mappedAlerts = results.map((result, idx) => ({
          id: `${result.metric.alertname || idx}`,
          alertname: result.metric.alertname || "Unknown Alert",
          severity: (result.metric.severity || "info").toLowerCase(),
          description: result.metric.description || "No description provided",
          job: result.metric.job || "unknown",
          instance: result.metric.instance || "unknown",
          time: new Date().toLocaleTimeString(),
        }));

        if (active) {
          setAlerts(mappedAlerts);
        }
      } catch (err) {
        console.error("Failed to load alerts", err);
      } finally {
        if (active) {
          setIsFetching(false);
        }
      }
    }

    void fetchAlerts();
    const id = window.setInterval(fetchAlerts, 20000);

    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div>
          <p className="admin-eyebrow">Alert visibility</p>
          <h3 className="admin-title text-2xl">Viewer alert feed</h3>
          <p className="mt-2 text-sm text-(--admin-muted)">
            Read-only stream of active alerts and incident metadata.
          </p>
        </div>
      </section>

      <section className="admin-panel p-6">
        {isFetching ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--admin-ink) border-t-transparent" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 border border-(--admin-line)">
              <ShieldAlert className="h-7 w-7 text-(--admin-muted)" />
            </div>
            <h3 className="text-lg font-semibold text-(--admin-ink)">No Active Alerts</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Your system is running smoothly. There are no active warnings.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-xl ${
                      alert.severity === "critical"
                        ? "bg-[rgba(201,139,79,0.2)]"
                        : alert.severity === "warning"
                          ? "bg-[rgba(201,139,79,0.15)]"
                          : "bg-[rgba(108,140,196,0.18)]"
                    }`}
                  >
                    {alert.severity === "critical" || alert.severity === "warning" ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <Info className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-(--admin-ink)">{alert.alertname}</p>
                      <span className="rounded-full border border-(--admin-line) px-2 py-1 text-xs font-semibold uppercase">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-(--admin-muted)">{alert.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-(--admin-muted)">
                      <span className="rounded-full border border-(--admin-line) px-2 py-1">Job: {alert.job}</span>
                      <span className="rounded-full border border-(--admin-line) px-2 py-1">Instance: {alert.instance}</span>
                      <span className="rounded-full border border-(--admin-line) px-2 py-1">Updated: {alert.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
