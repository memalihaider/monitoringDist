import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/server-auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { queryPrometheus } from "@/lib/prometheus/client";

type PrometheusVector = {
  metric: Record<string, string>;
  value: [number, string];
};

function parseFirstPrometheusValue(results: PrometheusVector[] | undefined) {
  if (!results || results.length === 0) {
    return null;
  }
  const value = Number(results[0]?.value?.[1] ?? "NaN");
  return Number.isFinite(value) ? value : null;
}

async function countUsers() {
  const auth = getAdminAuth();
  let nextPageToken: string | undefined;
  let total = 0;

  do {
    const result = await auth.listUsers(1000, nextPageToken);
    total += result.users.length;
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  return total;
}

export async function GET(request: NextRequest) {
  try {
    await authorizeRequest(request, ["admin"]);

    const db = getAdminDb();

    const [
      usersTotal,
      roleSnapshot,
      alertAckSnapshot,
      settingsDoc,
      recentAuditSnapshot,
      servicesUp,
      cpuLoad,
      memoryUsed,
    ] = await Promise.all([
      countUsers(),
      db.collection("user_roles").get(),
      db.collection("alert_acknowledgements").get(),
      db.collection("admin_config").doc("system").get(),
      db
        .collection("admin_audit_events")
        .where("createdAt", ">=", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .get(),
      queryPrometheus("sum(up)").catch(() => null),
      queryPrometheus('avg(rate(node_cpu_seconds_total{mode!="idle"}[5m])) * 100').catch(() => null),
      queryPrometheus("(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100").catch(
        () => null,
      ),
    ]);

    let admin = 0;
    let operator = 0;
    let viewer = 0;
    let unassigned = 0;

    for (const docSnap of roleSnapshot.docs) {
      const role = docSnap.data().role;
      if (role === "admin") {
        admin += 1;
      } else if (role === "operator") {
        operator += 1;
      } else if (role === "viewer") {
        viewer += 1;
      } else {
        unassigned += 1;
      }
    }

    const telemetry = {
      servicesUp: parseFirstPrometheusValue(servicesUp?.result as PrometheusVector[] | undefined),
      cpuLoadPercent: parseFirstPrometheusValue(cpuLoad?.result as PrometheusVector[] | undefined),
      memoryUsedPercent: parseFirstPrometheusValue(memoryUsed?.result as PrometheusVector[] | undefined),
    };

    return NextResponse.json({
      totals: {
        users: usersTotal,
        roles: roleSnapshot.size,
        acknowledgedAlerts: alertAckSnapshot.size,
        settingsConfigured: settingsDoc.exists,
        auditEvents24h: recentAuditSnapshot.size,
      },
      roles: {
        admin,
        operator,
        viewer,
        unassigned,
      },
      telemetry,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
