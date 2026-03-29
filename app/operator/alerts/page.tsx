"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

type AckRecord = {
  id: string;
  alertId: string;
  acknowledgedBy: string;
  acknowledgedAt: string;
  updatedAt: string;
  severity: string;
  title: string;
};

type PrometheusAlert = {
  metric: Record<string, string>;
  value: [number, string];
};

const FALLBACK_ALERTS = [
  { id: "high_cpu_node", title: "High CPU usage on node-exporter", severity: "Critical" },
  { id: "api_latency_p95", title: "API latency above threshold", severity: "Warning" },
  { id: "memory_pressure", title: "Memory pressure detected", severity: "Warning" },
];

export default function OperatorAlertsPage() {
  const [ackRecords, setAckRecords] = useState<AckRecord[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<Array<{ id: string; title: string; severity: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [ackResponse, alertsResponse] = await Promise.all([
        authenticatedFetch("/api/alerts/ack"),
        fetch("/api/prometheus/query?q=alerts"),
      ]);

      if (!ackResponse.ok) {
        const result = (await ackResponse.json()) as { error?: string };
        throw new Error(result.error ?? "Failed to load acknowledgements");
      }

      const ackJson = (await ackResponse.json()) as { acknowledgements?: AckRecord[] };
      setAckRecords(ackJson.acknowledgements ?? []);

      if (alertsResponse.ok) {
        const alertsJson = (await alertsResponse.json()) as {
          data?: { result?: PrometheusAlert[] };
        };
        const mapped = (alertsJson.data?.result ?? []).map((alert, index) => {
          const labels = alert.metric;
          const alertName = labels.alertname ?? labels.instance ?? `live_alert_${index + 1}`;
          return {
            id: alertName,
            title: labels.alertname ?? labels.job ?? `Prometheus Alert ${index + 1}`,
            severity: labels.severity ?? "Warning",
          };
        });

        setLiveAlerts(mapped.length > 0 ? mapped : FALLBACK_ALERTS);
      } else {
        setLiveAlerts(FALLBACK_ALERTS);
      }
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to load alerts";
      setError(nextMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function acknowledgeAlert(alertId: string, severity: string, title: string) {
    setActiveAlertId(alertId);
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch("/api/alerts/ack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alertId, severity, title }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Failed to acknowledge alert");
      }

      setMessage(`Acknowledged alert ${alertId}`);
      await loadData();
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to acknowledge alert";
      setError(nextMessage);
    } finally {
      setActiveAlertId(null);
    }
  }

  const acknowledgedIds = useMemo(() => new Set(ackRecords.map((entry) => entry.alertId)), [ackRecords]);

  const summary = useMemo(() => {
    const critical = liveAlerts.filter((alert) => alert.severity.toLowerCase() === "critical").length;
    const warning = liveAlerts.filter((alert) => alert.severity.toLowerCase() === "warning").length;
    return {
      total: liveAlerts.length,
      acknowledged: ackRecords.length,
      critical,
      warning,
    };
  }, [ackRecords.length, liveAlerts]);

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Incident desk</p>
            <h3 className="admin-title text-2xl">Operator alert queue</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Acknowledge active alerts and keep the response trail current.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="admin-chip">Total: {summary.total}</span>
            <span className="admin-chip">Ack: {summary.acknowledged}</span>
            <span className="admin-chip">Critical: {summary.critical}</span>
            <span className="admin-chip">Warning: {summary.warning}</span>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </section>

      <section className="admin-panel p-6">
        <div className="flex items-center justify-between">
          <h4 className="admin-title text-lg">Active alerts</h4>
          <ShieldAlert className="h-5 w-5 text-(--admin-muted)" />
        </div>

        {loading ? (
          <div className="mt-4 grid place-items-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--admin-ink) border-t-transparent" />
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {liveAlerts.map((alert) => {
              const isAck = acknowledgedIds.has(alert.id);
              const severity = alert.severity.toLowerCase();
              return (
                <article
                  key={alert.id}
                  className="rounded-2xl border border-(--admin-line) bg-white/80 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-(--admin-ink)">{alert.title}</p>
                      <p className="text-xs text-(--admin-muted)">ID: {alert.id}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-semibold uppercase ${
                          severity === "critical"
                            ? "border-(--admin-ink) bg-[rgba(20,21,21,0.1)]"
                            : "border-(--admin-line) bg-[rgba(240,164,60,0.15)]"
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <button
                        className="rounded-full border border-(--admin-ink) bg-(--admin-ink) px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        disabled={isAck || activeAlertId === alert.id}
                        onClick={() => {
                          void acknowledgeAlert(alert.id, alert.severity, alert.title);
                        }}
                      >
                        {isAck ? "Acknowledged" : activeAlertId === alert.id ? "Saving..." : "Acknowledge"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="admin-panel p-6">
        <h4 className="admin-title text-lg">Acknowledgement history</h4>

        {ackRecords.length === 0 ? (
          <p className="mt-3 text-sm text-(--admin-muted)">No acknowledgements yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-(--admin-line) text-left text-xs uppercase tracking-widest text-(--admin-muted)">
                  <th className="px-2 py-2 font-semibold">Alert</th>
                  <th className="px-2 py-2 font-semibold">Severity</th>
                  <th className="px-2 py-2 font-semibold">Acknowledged By</th>
                  <th className="px-2 py-2 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {ackRecords.map((entry) => (
                  <tr key={entry.id} className="border-b border-(--admin-line)/60">
                    <td className="px-2 py-3">
                      <p className="font-semibold">{entry.title}</p>
                      <p className="text-xs text-(--admin-muted)">{entry.alertId}</p>
                    </td>
                    <td className="px-2 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) px-2 py-1 text-xs font-semibold uppercase">
                        {entry.severity.toLowerCase() === "critical" ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {entry.severity}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-xs text-(--admin-muted)">{entry.acknowledgedBy}</td>
                    <td className="px-2 py-3 text-xs">{entry.acknowledgedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
