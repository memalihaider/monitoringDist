"use client";

import { useState } from "react";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { Activity, FlaskConical, Play, Siren, Target } from "lucide-react";

type DiagnosticsResult = {
  servicesUp: number | null;
  cpuLoadPercent: number | null;
  memoryUsedPercent: number | null;
  checkedAt: string;
};

type SyntheticResult = {
  syntheticAlertId: string;
  severity: string;
  title: string;
};

function formatMetric(value: number | null, suffix = "") {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }
  return `${value.toFixed(1)}${suffix}`;
}

export default function AdminAdvancedPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null);
  const [synthetic, setSynthetic] = useState<SyntheticResult | null>(null);
  const [alertTitle, setAlertTitle] = useState("Synthetic alert from advanced tools");
  const [alertSeverity, setAlertSeverity] = useState("Warning");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runDiagnostics() {
    setLoadingAction("diagnostics");
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch("/api/admin/advanced", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "diagnostics" }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Failed to run diagnostics");
      }

      const result = (await response.json()) as { result?: DiagnosticsResult };
      setDiagnostics(result.result ?? null);
      setMessage("Diagnostics completed successfully");
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to run diagnostics";
      setError(nextMessage);
    } finally {
      setLoadingAction(null);
    }
  }

  async function createSyntheticAlert() {
    setLoadingAction("synthetic");
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch("/api/admin/advanced", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "seed_alert",
          title: alertTitle,
          severity: alertSeverity,
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Failed to create synthetic alert");
      }

      const result = (await response.json()) as { result?: SyntheticResult };
      setSynthetic(result.result ?? null);
      setMessage("Synthetic alert created");
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to create synthetic alert";
      setError(nextMessage);
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <p className="admin-eyebrow">Advanced tools</p>
            <h3 className="admin-title text-2xl">Operator diagnostics</h3>
            <p className="mt-1 text-sm text-(--admin-muted)">
              Execute diagnostics, simulate incidents, and validate operational readiness.
            </p>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </section>

      <section className="admin-panel p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <h4 className="admin-title text-lg">Live diagnostics</h4>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-(--admin-ink) bg-(--admin-ink) px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            disabled={loadingAction !== null}
            onClick={() => {
              void runDiagnostics();
            }}
          >
            <Play className="h-4 w-4" />
            {loadingAction === "diagnostics" ? "Running..." : "Run Diagnostics"}
          </button>
        </div>
        <p className="mt-2 text-sm text-(--admin-muted)">
          Prometheus-backed checks for uptime, CPU load, and memory health.
        </p>

        {diagnostics ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
              <p className="text-xs uppercase tracking-widest text-(--admin-muted)">Services Up</p>
              <p className="mt-2 text-2xl font-semibold">{formatMetric(diagnostics.servicesUp)}</p>
              <p className="mt-1 text-xs text-(--admin-muted)">Checked {diagnostics.checkedAt}</p>
            </div>
            <div className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
              <p className="text-xs uppercase tracking-widest text-(--admin-muted)">CPU Load</p>
              <p className="mt-2 text-2xl font-semibold">{formatMetric(diagnostics.cpuLoadPercent, "%")}</p>
              <p className="mt-1 text-xs text-(--admin-muted)">Target below 80%</p>
            </div>
            <div className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
              <p className="text-xs uppercase tracking-widest text-(--admin-muted)">Memory Used</p>
              <p className="mt-2 text-2xl font-semibold">{formatMetric(diagnostics.memoryUsedPercent, "%")}</p>
              <p className="mt-1 text-xs text-(--admin-muted)">Nominal range 45-70%</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="admin-panel p-6">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          <h4 className="admin-title text-lg">Synthetic incident injection</h4>
        </div>
        <p className="mt-2 text-sm text-(--admin-muted)">
          Create a synthetic alert to rehearse incident response and monitoring validation.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            type="text"
            className="rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm md:col-span-2"
            value={alertTitle}
            onChange={(event) => setAlertTitle(event.target.value)}
            placeholder="Alert title"
          />
          <select
            className="rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
            value={alertSeverity}
            onChange={(event) => setAlertSeverity(event.target.value)}
          >
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
            <option value="Info">Info</option>
          </select>
        </div>

        <button
          className="mt-4 rounded-full border border-(--admin-ink) bg-(--admin-ink) px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          disabled={loadingAction !== null}
          onClick={() => {
            void createSyntheticAlert();
          }}
        >
          {loadingAction === "synthetic" ? "Creating..." : "Create Synthetic Alert"}
        </button>

        {synthetic ? (
          <div className="mt-4 rounded-2xl border border-(--admin-line) bg-white/80 p-4 text-sm">
            <p className="font-semibold">Created alert</p>
            <p className="text-xs text-(--admin-muted)">ID: {synthetic.syntheticAlertId}</p>
            <p>Severity: {synthetic.severity}</p>
            <p>Title: {synthetic.title}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
