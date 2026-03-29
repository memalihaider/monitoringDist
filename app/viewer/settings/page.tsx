"use client";

import { Bell, Eye, Shield } from "lucide-react";

const SETTINGS = [
  {
    title: "Alert visibility",
    description: "Viewer alerts are scoped to read-only access.",
    icon: Bell,
  },
  {
    title: "Data privacy",
    description: "Sensitive values are masked for viewer sessions.",
    icon: Eye,
  },
  {
    title: "Access policy",
    description: "Viewer role updates are managed by admins.",
    icon: Shield,
  },
];

export default function ViewerSettingsPage() {
  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <p className="admin-eyebrow">Settings</p>
        <h3 className="admin-title text-2xl">Viewer access rules</h3>
        <p className="mt-2 text-sm text-(--admin-muted)">
          Settings are read-only in the viewer portal.
        </p>
      </section>

      <section className="admin-panel p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {SETTINGS.map((setting) => (
            <div
              key={setting.title}
              className="rounded-2xl border border-(--admin-line) bg-white/80 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
                  <setting.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-(--admin-ink)">{setting.title}</p>
              </div>
              <p className="mt-3 text-xs text-(--admin-muted)">{setting.description}</p>
              <div className="mt-4 rounded-2xl border border-dashed border-(--admin-line) px-3 py-2 text-[11px] text-(--admin-muted)">
                Updates require admin approval.
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
