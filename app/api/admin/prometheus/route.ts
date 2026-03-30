import { NextRequest, NextResponse } from "next/server";
import { createAdminAuditEvent } from "@/lib/admin/audit-log";
import { authorizeRequest } from "@/lib/auth/server-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  normalizePrometheusQueryKey,
} from "@/lib/prometheus/query-catalog";
import { listResolvedPrometheusQueries } from "@/lib/prometheus/query-resolver";

type PrometheusInput = {
  id?: string;
  key?: string;
  label?: string;
  description?: string;
  promQl?: string;
  enabled?: boolean;
};

function normalizePrometheusPayload(input: PrometheusInput) {
  const key = normalizePrometheusQueryKey(input.key ?? "");
  const label = input.label?.trim() ?? "";
  const promQl = input.promQl?.trim() ?? "";

  if (!key || !label || !promQl) {
    return null;
  }

  return {
    key,
    label,
    description: input.description?.trim() ?? "",
    promQl,
    enabled: input.enabled !== false,
  };
}

export async function GET(request: NextRequest) {
  try {
    await authorizeRequest(request, ["admin"]);
    const queries = await listResolvedPrometheusQueries(getAdminDb());
    return NextResponse.json({ queries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    const body = (await request.json()) as PrometheusInput;
    const payload = normalizePrometheusPayload(body);

    if (!payload) {
      return NextResponse.json({ error: "key/label/promQl are required" }, { status: 400 });
    }

    const existing = await getAdminDb()
      .collection("admin_prometheus_queries")
      .where("key", "==", payload.key)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ error: "query key already exists" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const docRef = getAdminDb().collection("admin_prometheus_queries").doc();
    await docRef.set({
      ...payload,
      createdAt: now,
      updatedAt: now,
      updatedBy: authUser.uid,
    });

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "create_prometheus_query",
      target: docRef.id,
      detail: `Created query ${payload.key}`,
      severity: "info",
    });

    return NextResponse.json({ status: "created", id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    const body = (await request.json()) as PrometheusInput;
    const id = body.id?.trim();
    const payload = normalizePrometheusPayload(body);

    if (!id || !payload) {
      return NextResponse.json({ error: "id and payload are required" }, { status: 400 });
    }

    const duplicate = await getAdminDb()
      .collection("admin_prometheus_queries")
      .where("key", "==", payload.key)
      .limit(5)
      .get();

    if (duplicate.docs.some((docSnap) => docSnap.id !== id)) {
      return NextResponse.json({ error: "query key already exists" }, { status: 409 });
    }

    await getAdminDb().collection("admin_prometheus_queries").doc(id).set(
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
      action: "update_prometheus_query",
      target: id,
      detail: `Updated query ${payload.key}`,
      severity: "warning",
    });

    return NextResponse.json({ status: "updated", id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    const id = request.nextUrl.searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await getAdminDb().collection("admin_prometheus_queries").doc(id).delete();

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "delete_prometheus_query",
      target: id,
      detail: "Deleted custom Prometheus query",
      severity: "critical",
    });

    return NextResponse.json({ status: "deleted", id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
