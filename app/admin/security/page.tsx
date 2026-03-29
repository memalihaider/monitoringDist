"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";

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

const SEVERITY_STYLE: Record<string, string> = {
  info: "bg-white text-black",
  warning: "bg-neutral-100 text-black",
  critical: "bg-black text-white",
};

export default function AdminSecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadEvents() {
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch("/api/admin/security");
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Failed to load security logs");
      }

      const result = (await response.json()) as { events?: SecurityEvent[] };
      setEvents(result.events ?? []);
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to load security logs";
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

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Security posture</p>
            <h3 className="admin-title text-2xl">Control surface review</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Review privileged activity, validate controls, and maintain audit readiness.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="admin-chip">Critical: {summary.critical}</span>
            <span className="admin-chip">Warning: {summary.warning}</span>
            <span className="admin-chip">Info: {summary.info}</span>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="admin-panel p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h4 className="admin-title text-lg">Recent security events</h4>
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
            <p className="text-sm text-(--admin-muted)">No security events logged yet.</p>
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
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h4 className="admin-title text-lg">Security guardrails</h4>
              <p className="text-sm text-(--admin-muted)">
                Keep settings, access, and audit channels aligned.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
              <p className="font-semibold">Identity governance</p>
              <p className="mt-1 text-xs text-(--admin-muted)">
                Validate roles, enforce MFA, and review new access.
              </p>
              <Link
                href="/admin/users"
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-(--admin-ink)"
              >
                Manage users
              </Link>
            </div>
            <div className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
              <p className="font-semibold">Audit workflows</p>
              <p className="mt-1 text-xs text-(--admin-muted)">
                Use the audit log to verify change history and compliance.
              </p>
              <Link
                href="/admin/audit"
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-(--admin-ink)"
              >
                Open audit log
              </Link>
            </div>
            <div className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
              <p className="font-semibold">Settings baseline</p>
              <p className="mt-1 text-xs text-(--admin-muted)">
                Confirm maintenance posture and telemetry cadence.
              </p>
              <Link
                href="/admin/settings"
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-(--admin-ink)"
              >
                Review settings
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
