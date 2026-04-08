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

function calculateMetrics(servicesUp: number | null, cpuLoad: number | null, memoryUsed: number | null, alertsAcked: number, auditEvents: number) {
  // Calculate service availability percentage
  const serviceAvailability = servicesUp !== null ? Math.max(0, Math.min(100, (servicesUp / 5) * 100)) : null;
  
  // Calculate system health score (0-100)
  const healthComponents: number[] = [];
  if (serviceAvailability !== null) healthComponents.push(serviceAvailability);
  if (cpuLoad !== null) healthComponents.push(Math.max(0, 100 - cpuLoad));
  if (memoryUsed !== null) healthComponents.push(Math.max(0, 100 - memoryUsed));
  const systemHealthScore = healthComponents.length > 0 ? healthComponents.reduce((a, b) => a + b, 0) / healthComponents.length : null;
  
  // Calculate alert response score
  const alertResponseScore = auditEvents > 0 ? Math.min(100, (alertsAcked / auditEvents) * 100) : 100;
  
  return {
    serviceAvailability,
    systemHealthScore,
    alertResponseScore,
    cpuHeadroom: cpuLoad !== null ? Math.max(0, 100 - cpuLoad) : null,
    memoryHeadroom: memoryUsed !== null ? Math.max(0, 100 - memoryUsed) : null,
  };
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

    const servicesUpValue = parseFirstPrometheusValue(servicesUp?.result as PrometheusVector[] | undefined);
    const cpuLoadValue = parseFirstPrometheusValue(cpuLoad?.result as PrometheusVector[] | undefined);
    const memoryUsedValue = parseFirstPrometheusValue(memoryUsed?.result as PrometheusVector[] | undefined);

    const telemetry = {
      servicesUp: servicesUpValue,
      cpuLoadPercent: cpuLoadValue,
      memoryUsedPercent: memoryUsedValue,
    };

    const calculations = calculateMetrics(
      servicesUpValue,
      cpuLoadValue,
      memoryUsedValue,
      alertAckSnapshot.size,
      recentAuditSnapshot.size
    );

    const totalRoles = roleSnapshot.size;
    const rolePercentages = totalRoles > 0 ? {
      admin: (admin / totalRoles) * 100,
      operator: (operator / totalRoles) * 100,
      viewer: (viewer / totalRoles) * 100,
      unassigned: (unassigned / totalRoles) * 100,
    } : { admin: 0, operator: 0, viewer: 0, unassigned: 0 };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
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
      rolePercentages,
      telemetry,
      calculations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
