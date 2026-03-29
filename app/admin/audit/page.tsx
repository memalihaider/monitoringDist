"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { ShieldAlert, ShieldCheck, ClipboardCheck } from "lucide-react";

type SecurityEvent = {
  id: string;
  actorUid: string;
  actorRole: string;
  action: string;
  target: string;
  detail: string;
  severity: string;
  createdAt: string;
};

type AuditFormState = {
  action: string;
  target: string;
  detail: string;
  severity: "info" | "warning" | "critical";
};

const SEVERITY_STYLE: Record<string, string> = {
  info: "bg-white text-black",
  warning: "bg-[rgba(240,164,60,0.16)] text-black",
  critical: "bg-[rgba(20,21,21,0.1)] text-black",
};

export default function AdminAuditPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<AuditFormState>({
    action: "manual_event",
    target: "admin_console",
    detail: "",
    severity: "info",
  });
  const [submitting, setSubmitting] = useState(false);

  async function loadEvents() {
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch("/api/admin/security");
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Failed to load audit log");
      }

      const result = (await response.json()) as { events?: SecurityEvent[] };
      setEvents(result.events ?? []);
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to load audit log";
      setError(nextMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  const summary = useMemo(() => {
    const critical = events.filter((event) => event.severity === "critical").length;
    const warning = events.filter((event) => event.severity === "warning").length;
    const info = events.filter((event) => event.severity === "info").length;
    return { critical, warning, info, total: events.length };
  }, [events]);

  async function submitAuditEvent() {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch("/api/admin/security", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Failed to log audit event");
      }

      setMessage("Audit event logged");
      setForm((prev) => ({ ...prev, detail: "" }));
      await loadEvents();
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to log audit event";
      setError(nextMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Audit readiness</p>
            <h3 className="admin-title text-2xl">Immutable audit ledger</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Review and append to the authoritative record of administrative actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="admin-chip">Total: {summary.total}</span>
            <span className="admin-chip">Critical: {summary.critical}</span>
            <span className="admin-chip">Warning: {summary.warning}</span>
            <span className="admin-chip">Info: {summary.info}</span>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="admin-panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="admin-title text-lg">Audit trail</h4>
            <button
              className="rounded-full border border-(--admin-line) bg-white px-3 py-1.5 text-xs font-semibold"
              onClick={() => {
                void loadEvents();
              }}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="grid place-items-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--admin-ink) border-t-transparent" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-(--admin-muted)">No audit events logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-(--admin-line) text-left text-xs uppercase tracking-widest text-(--admin-muted)">
                    <th className="px-2 py-2 font-semibold">Severity</th>
                    <th className="px-2 py-2 font-semibold">Action</th>
                    <th className="px-2 py-2 font-semibold">Target</th>
                    <th className="px-2 py-2 font-semibold">Actor</th>
                    <th className="px-2 py-2 font-semibold">Detail</th>
                    <th className="px-2 py-2 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b border-(--admin-line)/60">
                      <td className="px-2 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold uppercase ${
                            SEVERITY_STYLE[event.severity] ?? "bg-white text-black"
                          }`}
                        >
                          {event.severity === "critical" ? (
                            <ShieldAlert className="h-3.5 w-3.5" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                          {event.severity}
                        </span>
                      </td>
                      <td className="px-2 py-3 font-semibold">{event.action}</td>
                      <td className="px-2 py-3">{event.target}</td>
                      <td className="px-2 py-3">
                        <p className="font-semibold uppercase">{event.actorRole}</p>
                        <p className="text-xs text-(--admin-muted)">{event.actorUid}</p>
                      </td>
                      <td className="px-2 py-3 text-xs text-(--admin-muted)">{event.detail || "-"}</td>
                      <td className="px-2 py-3 text-xs">{event.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-panel p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="admin-title text-lg">Log manual event</h4>
              <p className="text-sm text-(--admin-muted)">
                Append a governance note directly to the audit ledger.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <label className="block text-xs uppercase tracking-widest text-(--admin-muted)">
              Action
              <input
                className="mt-2 w-full rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
                value={form.action}
                onChange={(event) => setForm((prev) => ({ ...prev, action: event.target.value }))}
              />
            </label>
            <label className="block text-xs uppercase tracking-widest text-(--admin-muted)">
              Target
              <input
                className="mt-2 w-full rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
                value={form.target}
                onChange={(event) => setForm((prev) => ({ ...prev, target: event.target.value }))}
              />
            </label>
            <label className="block text-xs uppercase tracking-widest text-(--admin-muted)">
              Severity
              <select
                className="mt-2 w-full rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
                value={form.severity}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    severity: event.target.value as AuditFormState["severity"],
                  }))
                }
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="block text-xs uppercase tracking-widest text-(--admin-muted)">
              Detail
              <textarea
                className="mt-2 min-h-30 w-full rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
                value={form.detail}
                onChange={(event) => setForm((prev) => ({ ...prev, detail: event.target.value }))}
                placeholder="Describe the administrative action"
              />
            </label>
          </div>

          <button
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-(--admin-ink) bg-(--admin-ink) px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            onClick={() => {
              void submitAuditEvent();
            }}
            disabled={submitting}
          >
            {submitting ? "Logging..." : "Log audit event"}
          </button>
        </div>
      </section>
    </div>
  );
}
