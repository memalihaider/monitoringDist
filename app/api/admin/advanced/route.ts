import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/server-auth";
import { createAdminAuditEvent } from "@/lib/admin/audit-log";
import { getAdminDb } from "@/lib/firebase/admin";
import { queryPrometheus } from "@/lib/prometheus/client";

function parseFirstMetricValue(value: unknown) {
  const rows = value as Array<{ value?: [number, string] }>;
  if (!Array.isArray(rows) || rows.length === 0 || !rows[0]?.value) {
    return null;
  }

  const parsed = Number(rows[0].value[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    const body = (await request.json()) as {
      action?: "diagnostics" | "seed_alert";
      title?: string;
      severity?: string;
    };

    if (body.action === "seed_alert") {
      const now = new Date().toISOString();
      const syntheticId = `synthetic_${Date.now()}`;
      const severity = body.severity?.trim() || "Warning";
      const title = body.title?.trim() || "Synthetic alert from Admin Advanced page";

      await Promise.all([
        getAdminDb().collection("alert_acknowledgements").doc(syntheticId).set({
          alertId: syntheticId,
          severity,
          title,
          acknowledgedBy: authUser.uid,
          acknowledgedAt: now,
          updatedAt: now,
        }),
        createAdminAuditEvent({
          actorUid: authUser.uid,
          actorRole: authUser.role,
          action: "seed_alert",
          target: syntheticId,
          detail: `Created synthetic alert '${title}' (${severity})`,
          severity: "warning",
        }),
      ]);

      return NextResponse.json({
        status: "ok",
        result: {
          syntheticAlertId: syntheticId,
          severity,
          title,
        },
      });
    }

    const [servicesUp, cpuLoad, memoryUsed] = await Promise.all([
      queryPrometheus("sum(up)").catch(() => null),
      queryPrometheus('avg(rate(node_cpu_seconds_total{mode!="idle"}[5m])) * 100').catch(() => null),
      queryPrometheus("(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100").catch(
        () => null,
      ),
    ]);

    const diagnostics = {
      servicesUp: parseFirstMetricValue(servicesUp?.result),
      cpuLoadPercent: parseFirstMetricValue(cpuLoad?.result),
      memoryUsedPercent: parseFirstMetricValue(memoryUsed?.result),
      checkedAt: new Date().toISOString(),
    };

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "run_diagnostics",
      target: "prometheus",
      detail: `servicesUp=${diagnostics.servicesUp}, cpu=${diagnostics.cpuLoadPercent}, memory=${diagnostics.memoryUsedPercent}`,
      severity: "info",
    });

    return NextResponse.json({ status: "ok", result: diagnostics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
