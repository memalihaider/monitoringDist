"use client";

import { useState } from "react";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { Siren, Sparkles } from "lucide-react";

type SyntheticResult = {
  syntheticAlertId: string;
  severity: string;
  title: string;
};

export default function AdminSyntheticAlertsPage() {
  const [synthetic, setSynthetic] = useState<SyntheticResult | null>(null);
  const [alertTitle, setAlertTitle] = useState("Synthetic alert from admin console");
  const [alertSeverity, setAlertSeverity] = useState("Warning");
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createSyntheticAlert() {
    setLoadingAction(true);
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
      setLoadingAction(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
            <Siren className="h-5 w-5" />
          </div>
          <div>
            <p className="admin-eyebrow">Incident rehearsal</p>
            <h3 className="admin-title text-2xl">Synthetic alert injection</h3>
            <p className="mt-1 text-sm text-(--admin-muted)">
              Trigger simulated alerts to validate incident workflows and response latency.
            </p>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </section>

      <section className="admin-panel p-6">
        <div className="grid gap-3 md:grid-cols-3">
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
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-(--admin-ink) bg-(--admin-ink) px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          disabled={loadingAction}
          onClick={() => {
            void createSyntheticAlert();
          }}
        >
          <Sparkles className="h-4 w-4" />
          {loadingAction ? "Creating..." : "Create Synthetic Alert"}
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
