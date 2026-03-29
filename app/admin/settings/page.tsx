"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { Save, Settings, Sliders } from "lucide-react";

type AdminSettings = {
  maintenanceMode: boolean;
  telemetryRefreshSeconds: number;
  alertSensitivity: "low" | "balanced" | "high";
  docsWriteRole: "admin" | "operator";
};

const DEFAULT_SETTINGS: AdminSettings = {
  maintenanceMode: false,
  telemetryRefreshSeconds: 30,
  alertSensitivity: "balanced",
  docsWriteRole: "admin",
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch("/api/admin/settings");
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Failed to load settings");
      }

      const result = (await response.json()) as { settings?: AdminSettings };
      setSettings(result.settings ?? DEFAULT_SETTINGS);
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to load settings";
      setError(nextMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function saveSettings() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Failed to save settings");
      }

      const result = (await response.json()) as { settings?: AdminSettings };
      if (result.settings) {
        setSettings(result.settings);
      }

      setMessage("Settings saved successfully");
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to save settings";
      setError(nextMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <p className="admin-eyebrow">System profile</p>
            <h3 className="admin-title text-2xl">Runtime configuration</h3>
            <p className="mt-1 text-sm text-(--admin-muted)">
              Configure telemetry cadence, alerting posture, and documentation controls.
            </p>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </section>

      <section className="admin-panel p-6">
        {loading ? (
          <div className="grid place-items-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--admin-ink) border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-(--admin-muted)">
                Telemetry Refresh (Seconds)
              </span>
              <input
                type="number"
                min={10}
                max={300}
                className="mt-3 w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
                value={settings.telemetryRefreshSeconds}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    telemetryRefreshSeconds: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-(--admin-muted)">
                Alert Sensitivity
              </span>
              <select
                className="mt-3 w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
                value={settings.alertSensitivity}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    alertSensitivity: event.target.value as AdminSettings["alertSensitivity"],
                  }))
                }
              >
                <option value="low">Low</option>
                <option value="balanced">Balanced</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-(--admin-muted)">
                Documentation Write Role
              </span>
              <select
                className="mt-3 w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
                value={settings.docsWriteRole}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    docsWriteRole: event.target.value as AdminSettings["docsWriteRole"],
                  }))
                }
              >
                <option value="admin">Admin Only</option>
                <option value="operator">Admin + Operator</option>
              </select>
            </label>

            <label className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-(--admin-muted)">
                Maintenance Mode
              </span>
              <div className="mt-3 flex items-center gap-3">
                <input
                  id="maintenance-toggle"
                  type="checkbox"
                  className="h-4 w-4 accent-(--admin-ink)"
                  checked={settings.maintenanceMode}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      maintenanceMode: event.target.checked,
                    }))
                  }
                />
                <label htmlFor="maintenance-toggle" className="text-sm font-medium text-(--admin-ink)">
                  Enable platform maintenance restrictions
                </label>
              </div>
            </label>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-(--admin-muted)">
            <Sliders className="h-4 w-4" />
            Changes apply immediately across the admin portal.
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-(--admin-ink) bg-(--admin-ink) px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"
            disabled={saving || loading}
            onClick={() => {
              void saveSettings();
            }}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </section>
    </div>
  );
}
