import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/server-auth";
import { createAdminAuditEvent } from "@/lib/admin/audit-log";
import { getAdminDb } from "@/lib/firebase/admin";

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

function normalizeSettings(value: unknown): AdminSettings {
  const settings = (value ?? {}) as Partial<AdminSettings>;

  const telemetryRefreshSeconds =
    typeof settings.telemetryRefreshSeconds === "number" &&
    Number.isFinite(settings.telemetryRefreshSeconds) &&
    settings.telemetryRefreshSeconds >= 10 &&
    settings.telemetryRefreshSeconds <= 300
      ? Math.round(settings.telemetryRefreshSeconds)
      : DEFAULT_SETTINGS.telemetryRefreshSeconds;

  return {
    maintenanceMode: settings.maintenanceMode === true,
    telemetryRefreshSeconds,
    alertSensitivity:
      settings.alertSensitivity === "low" ||
      settings.alertSensitivity === "balanced" ||
      settings.alertSensitivity === "high"
        ? settings.alertSensitivity
        : DEFAULT_SETTINGS.alertSensitivity,
    docsWriteRole:
      settings.docsWriteRole === "operator" || settings.docsWriteRole === "admin"
        ? settings.docsWriteRole
        : DEFAULT_SETTINGS.docsWriteRole,
  };
}

export async function GET(request: NextRequest) {
  try {
    await authorizeRequest(request, ["admin"]);

    const docSnap = await getAdminDb().collection("admin_config").doc("system").get();
    const settings = docSnap.exists ? normalizeSettings(docSnap.data()) : DEFAULT_SETTINGS;

    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    const body = (await request.json()) as Partial<AdminSettings>;
    const settings = normalizeSettings(body);

    await Promise.all([
      getAdminDb().collection("admin_config").doc("system").set(
        {
          ...settings,
          updatedBy: authUser.uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      ),
      createAdminAuditEvent({
        actorUid: authUser.uid,
        actorRole: authUser.role,
        action: "update_admin_settings",
        target: "admin_config/system",
        detail: `maintenance=${settings.maintenanceMode}, refresh=${settings.telemetryRefreshSeconds}, sensitivity=${settings.alertSensitivity}`,
        severity: "warning",
      }),
    ]);

    return NextResponse.json({ status: "updated", settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
