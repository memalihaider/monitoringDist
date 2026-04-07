import { NextRequest, NextResponse } from "next/server";
import { createAdminAuditEvent } from "@/lib/admin/audit-log";
import { authorizeRequest, requireSuperAdmin } from "@/lib/auth/server-auth";
import { getAdminDb } from "@/lib/firebase/admin";

type MonitoringProjectInput = {
  id?: string;
  name?: string;
  description?: string;
  systemType?: string;
  targetUrl?: string;
  prometheusQuery?: string;
  expectedMetrics?: string[];
  enabled?: boolean;
  lastProbeStatus?: "up" | "down" | "unknown";
  lastProbeAt?: string;
  lastProbeLatencyMs?: number | null;
};

function normalizeMonitoringProjectInput(input: MonitoringProjectInput) {
  const name = input.name?.trim() ?? "";
  if (!name) {
    return null;
  }

  const targetUrl = input.targetUrl?.trim() ?? "";
  const systemType = (input.systemType?.trim() || "website").toLowerCase();

  return {
    name,
    description: input.description?.trim() ?? "",
    systemType,
    targetUrl,
    prometheusQuery: input.prometheusQuery?.trim() ?? "",
    expectedMetrics: (input.expectedMetrics ?? [])
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
    enabled: input.enabled !== false,
    lastProbeStatus: input.lastProbeStatus ?? "unknown",
    lastProbeAt: input.lastProbeAt?.trim() ?? "",
    lastProbeLatencyMs:
      typeof input.lastProbeLatencyMs === "number" && Number.isFinite(input.lastProbeLatencyMs)
        ? input.lastProbeLatencyMs
        : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);

    const snapshot = await getAdminDb()
      .collection("admin_monitoring_projects")
      .orderBy("updatedAt", "desc")
      .limit(300)
      .get();

    const projects = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      return {
        id: docSnap.id,
        name: String(data.name ?? ""),
        description: String(data.description ?? ""),
        systemType: String(data.systemType ?? "website"),
        targetUrl: String(data.targetUrl ?? ""),
        prometheusQuery: String(data.prometheusQuery ?? ""),
        expectedMetrics: Array.isArray(data.expectedMetrics)
          ? data.expectedMetrics.map((item) => String(item))
          : [],
        enabled: data.enabled !== false,
        lastProbeStatus: String(data.lastProbeStatus ?? "unknown"),
        lastProbeAt: String(data.lastProbeAt ?? ""),
        lastProbeLatencyMs:
          typeof data.lastProbeLatencyMs === "number" ? (data.lastProbeLatencyMs as number) : null,
        updatedAt: String(data.updatedAt ?? ""),
      };
    });

    return NextResponse.json({
      projects,
      canDelete: authUser.isSuperAdmin,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status =
      message === "Insufficient permissions" || message === "Super-admin permissions required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    const body = (await request.json()) as MonitoringProjectInput;
    const payload = normalizeMonitoringProjectInput(body);

    if (!payload) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const docRef = getAdminDb().collection("admin_monitoring_projects").doc();
    await docRef.set({
      ...payload,
      createdAt: now,
      updatedAt: now,
      updatedBy: authUser.uid,
    });

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "create_monitoring_project",
      target: docRef.id,
      detail: `Created monitoring project ${payload.name}`,
      severity: "info",
    });

    return NextResponse.json({ status: "created", id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status =
      message === "Insufficient permissions" || message === "Super-admin permissions required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    const body = (await request.json()) as MonitoringProjectInput;
    const id = body.id?.trim();
    const payload = normalizeMonitoringProjectInput(body);

    if (!id || !payload) {
      return NextResponse.json({ error: "id and name are required" }, { status: 400 });
    }

    await getAdminDb().collection("admin_monitoring_projects").doc(id).set(
      {
        ...payload,
        updatedAt: new Date().toISOString(),
        updatedBy: authUser.uid,
      },
      { merge: true },
    );

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "update_monitoring_project",
      target: id,
      detail: `Updated monitoring project ${payload.name}`,
      severity: "warning",
    });

    return NextResponse.json({ status: "updated", id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status =
      message === "Insufficient permissions" || message === "Super-admin permissions required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    requireSuperAdmin(authUser);

    const id = request.nextUrl.searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await getAdminDb().collection("admin_monitoring_projects").doc(id).delete();

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "delete_monitoring_project",
      target: id,
      detail: "Deleted monitoring project",
      severity: "critical",
    });

    return NextResponse.json({ status: "deleted", id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status =
      message === "Insufficient permissions" || message === "Super-admin permissions required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
