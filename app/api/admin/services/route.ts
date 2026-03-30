import { NextRequest, NextResponse } from "next/server";
import { createAdminAuditEvent } from "@/lib/admin/audit-log";
import { loadServicesCatalog, normalizeServiceInputKey } from "@/lib/admin/services-catalog";
import { authorizeRequest, requireSuperAdmin } from "@/lib/auth/server-auth";
import { getAdminDb } from "@/lib/firebase/admin";

type ServiceInput = {
  id?: string;
  serviceKey?: string;
  name?: string;
  description?: string;
  ownerTeam?: string;
  environment?: string;
  runbookUrl?: string;
  dashboardUrl?: string;
  statusNote?: string;
  enabled?: boolean;
};

function normalizeServicePayload(input: ServiceInput) {
  const serviceKey = normalizeServiceInputKey(input.serviceKey ?? input.name ?? "");
  const name = input.name?.trim() ?? "";

  if (!serviceKey || !name) {
    return null;
  }

  return {
    serviceKey,
    name,
    description: input.description?.trim() ?? "",
    ownerTeam: input.ownerTeam?.trim() ?? "",
    environment: input.environment?.trim() ?? "",
    runbookUrl: input.runbookUrl?.trim() ?? "",
    dashboardUrl: input.dashboardUrl?.trim() ?? "",
    statusNote: input.statusNote?.trim() ?? "",
    enabled: input.enabled !== false,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);

    const db = getAdminDb();
    const catalog = await loadServicesCatalog(db);

    return NextResponse.json({
      services: catalog.services,
      manualCount: catalog.manualServices.length,
      autoCount: catalog.autoServiceCount,
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
    const body = (await request.json()) as ServiceInput;
    const payload = normalizeServicePayload(body);

    if (!payload) {
      return NextResponse.json({ error: "serviceKey/name are required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const docRef = getAdminDb().collection("admin_services").doc();
    await docRef.set({
      ...payload,
      createdAt: now,
      updatedAt: now,
      updatedBy: authUser.uid,
    });

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "create_service",
      target: docRef.id,
      detail: `Created service ${payload.serviceKey}`,
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
    const body = (await request.json()) as ServiceInput;
    const id = body.id?.trim();
    const payload = normalizeServicePayload(body);

    if (!id || !payload) {
      return NextResponse.json({ error: "id and service payload are required" }, { status: 400 });
    }

    await getAdminDb().collection("admin_services").doc(id).set(
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
      action: "update_service",
      target: id,
      detail: `Updated service ${payload.serviceKey}`,
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

    await getAdminDb().collection("admin_services").doc(id).delete();
    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "delete_service",
      target: id,
      detail: "Deleted service registry entry",
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
