"use client";

import { useState } from "react";
import { BellRing, Mail, ShieldCheck } from "lucide-react";

export default function OperatorSettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [shiftMode, setShiftMode] = useState(true);

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <p className="admin-eyebrow">Operator settings</p>
        <h3 className="admin-title text-2xl">Notification controls</h3>
        <p className="mt-2 text-sm text-(--admin-muted)">
          Tune alert delivery and shift readiness without changing admin policies.
        </p>
      </section>

      <section className="admin-panel p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-(--admin-muted)">
              <Mail className="h-4 w-4" />
              Email alerts
            </span>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 accent-(--admin-ink)"
                checked={emailAlerts}
                onChange={(event) => setEmailAlerts(event.target.checked)}
              />
              <span className="text-sm text-(--admin-ink)">Send incident updates to email</span>
            </div>
          </label>

          <label className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-(--admin-muted)">
              <BellRing className="h-4 w-4" />
              SMS alerts
            </span>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 accent-(--admin-ink)"
                checked={smsAlerts}
                onChange={(event) => setSmsAlerts(event.target.checked)}
              />
              <span className="text-sm text-(--admin-ink)">Escalate critical alerts via SMS</span>
            </div>
          </label>

          <label className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-(--admin-muted)">
              <ShieldCheck className="h-4 w-4" />
              Shift mode
            </span>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 accent-(--admin-ink)"
                checked={shiftMode}
                onChange={(event) => setShiftMode(event.target.checked)}
              />
              <span className="text-sm text-(--admin-ink)">Enable high-priority alert routing</span>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}
