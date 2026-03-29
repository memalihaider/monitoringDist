"use client";

import { FileSpreadsheet, ShieldCheck, Sparkles } from "lucide-react";

const REPORTS = [
  {
    title: "Daily Operations Snapshot",
    description: "Read-only digest of uptime, incident rate, and top alerts.",
    cadence: "Daily",
    icon: FileSpreadsheet,
  },
  {
    title: "Risk Posture Summary",
    description: "Security posture changes and high-priority advisories.",
    cadence: "Weekly",
    icon: ShieldCheck,
  },
  {
    title: "Service Health Brief",
    description: "Highlights for SLAs, error budgets, and service owners.",
    cadence: "Monthly",
    icon: Sparkles,
  },
];

export default function ViewerReportsPage() {
  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <p className="admin-eyebrow">Reporting</p>
        <h3 className="admin-title text-2xl">Automated reports</h3>
        <p className="mt-2 text-sm text-(--admin-muted)">
          View scheduled summaries generated for operational visibility.
        </p>
      </section>

      <section className="admin-panel p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {REPORTS.map((report) => (
            <div
              key={report.title}
              className="rounded-2xl border border-(--admin-line) bg-white/80 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
                  <report.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-(--admin-ink)">{report.title}</p>
                  <p className="text-xs text-(--admin-muted)">{report.cadence} cadence</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-(--admin-muted)">{report.description}</p>
              <div className="mt-4 rounded-2xl border border-dashed border-(--admin-line) px-3 py-2 text-[11px] text-(--admin-muted)">
                Reports are read-only in viewer portal.
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
