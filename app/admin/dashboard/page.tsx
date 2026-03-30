"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import {
  Activity,
  BellRing,
  Cpu,
  Database,
  FileText,
  Gauge,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

type OverviewResponse = {
  totals: {
    users: number;
    roles: number;
    acknowledgedAlerts: number;
    settingsConfigured: boolean;
    auditEvents24h: number;
  };
  roles: {
    admin: number;
    operator: number;
    viewer: number;
    unassigned: number;
  };
  telemetry: {
    servicesUp: number | null;
    cpuLoadPercent: number | null;
    memoryUsedPercent: number | null;
  };
};

function formatMetric(value: number | null, suffix = "") {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }
  return `${value.toFixed(1)}${suffix}`;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError(null);

      try {
        const response = await authenticatedFetch("/api/admin/overview");
        if (!response.ok) {
          const result = (await response.json()) as { error?: string };
          throw new Error(result.error ?? "Failed to load admin overview");
        }

        const next = (await response.json()) as OverviewResponse;
        if (!cancelled) {
          setData(next);
        }
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "Failed to load admin overview";
        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, []);

  const quickLinks = useMemo(
    () => [
      {
        href: "/admin/users",
        label: "Identity Control",
        detail: "Provision operators and lock access.",
        icon: Users,
      },
      {
        href: "/admin/alerts",
        label: "Alert Desk",
        detail: "Acknowledge and resolve incidents.",
        icon: BellRing,
      },
      {
        href: "/admin/security",
        label: "Security Posture",
        detail: "Audit critical admin actions.",
        icon: ShieldCheck,
      },
      {
        href: "/admin/settings",
        label: "Runtime Settings",
        detail: "Tune refresh cadence and controls.",
        icon: UserCog,
      },
      {
        href: "/admin/reports",
        label: "Executive Reports",
        detail: "Export readiness and SLA briefs.",
        icon: FileText,
      },
      {
        href: "/admin/data-fetch",
        label: "Data Fetch",
        detail: "Run Prometheus and Firestore fetch jobs.",
        icon: Database,
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="admin-panel grid min-h-[40vh] place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--admin-ink) border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-panel p-6 text-sm text-(--admin-ink)">
        {error ?? "Unknown error"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6 reveal-up">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Command snapshot</p>
            <h3 className="admin-title text-2xl">Signal integrity report</h3>
            <p className="mt-2 text-sm text-(--admin-muted)">
              Live telemetry with audit awareness across users, alerts, and posture.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="admin-chip">Audit 24h: {data.totals.auditEvents24h}</span>
            <span className="admin-chip">Alerts ack: {data.totals.acknowledgedAlerts}</span>
            <span className="admin-chip">
              Settings: {data.totals.settingsConfigured ? "Configured" : "Default"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Users",
              value: data.totals.users,
              icon: Users,
              tint: "bg-[rgba(47,107,255,0.12)]",
            },
            {
              label: "Assigned Roles",
              value: data.totals.roles,
              icon: UserCog,
              tint: "bg-[rgba(28,140,112,0.12)]",
            },
            {
              label: "Active Alerts",
              value: data.totals.acknowledgedAlerts,
              icon: BellRing,
              tint: "bg-[rgba(240,164,60,0.16)]",
            },
            {
              label: "Audit Events",
              value: data.totals.auditEvents24h,
              icon: ShieldCheck,
              tint: "bg-[rgba(20,21,21,0.12)]",
            },
          ].map((card, idx) => (
            <div
              key={card.label}
              className={`rounded-2xl border border-(--admin-line) bg-white/80 p-4 shadow-[0_12px_20px_rgba(20,21,21,0.08)] ${
                idx === 1 ? "reveal-delay-1" : idx === 2 ? "reveal-delay-2" : idx === 3 ? "reveal-delay-3" : ""
              } reveal-up`}
            >
              <div className="flex items-center justify-between">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${card.tint}`}>
                  <card.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-(--admin-muted)">
                  Live
                </span>
              </div>
              <p className="mt-4 text-xs uppercase tracking-widest text-(--admin-muted)">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-semibold text-(--admin-ink)">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="admin-panel p-6">
          <div className="flex items-center justify-between">
            <h4 className="admin-title text-lg">Telemetry snapshot</h4>
            <Gauge className="h-5 w-5 text-(--admin-muted)" />
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-(--admin-muted)">Services up</span>
              <span className="font-semibold">{formatMetric(data.telemetry.servicesUp)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-(--admin-muted)">CPU load</span>
              <span className="font-semibold">{formatMetric(data.telemetry.cpuLoadPercent, "%")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-(--admin-muted)">Memory used</span>
              <span className="font-semibold">{formatMetric(data.telemetry.memoryUsedPercent, "%")}</span>
            </div>
          </div>
          <Link
            href="/admin/prometheus"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-(--admin-line) bg-white px-3 py-1.5 text-xs font-semibold text-(--admin-ink)"
          >
            <Activity className="h-3.5 w-3.5" />
            Open Prometheus
          </Link>
        </div>

        <div className="admin-panel p-6">
          <h4 className="admin-title text-lg">Role distribution</h4>
          <div className="mt-4 space-y-3 text-sm">
            {(
              [
                { label: "Admin", value: data.roles.admin, tone: "bg-(--admin-ink)" },
                { label: "Operator", value: data.roles.operator, tone: "bg-(--admin-accent)" },
                { label: "Viewer", value: data.roles.viewer, tone: "bg-(--admin-accent-3)" },
                { label: "Unassigned", value: data.roles.unassigned, tone: "bg-(--admin-accent-2)" },
              ] as const
            ).map((entry) => (
              <div key={entry.label}>
                <div className="flex items-center justify-between">
                  <span className="text-(--admin-muted)">{entry.label}</span>
                  <span className="font-semibold">{entry.value}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[rgba(20,21,21,0.08)]">
                  <div
                    className={`h-2 rounded-full ${entry.tone}`}
                    style={{ width: `${Math.min(entry.value * 12, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel p-6">
          <div className="flex items-center justify-between">
            <h4 className="admin-title text-lg">Operational pacing</h4>
            <Cpu className="h-5 w-5 text-(--admin-muted)" />
          </div>
          <p className="mt-2 text-sm text-(--admin-muted)">
            Track the team response rate and keep workflows aligned with live telemetry.
          </p>
          <div className="mt-4 rounded-2xl border border-(--admin-line) bg-white/80 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-(--admin-muted)">Response coverage</span>
              <span className="font-semibold">{data.totals.acknowledgedAlerts} events</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[rgba(47,107,255,0.12)]">
              <div
                className="h-2 rounded-full bg-(--admin-accent-3)"
                style={{ width: `${Math.min(data.totals.acknowledgedAlerts * 10, 100)}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-(--admin-muted)">
              <span>Audit + Alert timeline synced</span>
              <span>{data.totals.auditEvents24h} audits today</span>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-panel p-6">
        <h4 className="admin-title text-lg">Quick routes</h4>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item, idx) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl border border-(--admin-line) bg-white/80 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(20,21,21,0.12)] ${
                idx === 1 ? "reveal-delay-1" : idx === 2 ? "reveal-delay-2" : idx === 3 ? "reveal-delay-3" : ""
              } reveal-up`}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-(--admin-ink)">{item.label}</p>
                  <p className="mt-1 text-xs text-(--admin-muted)">{item.detail}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
