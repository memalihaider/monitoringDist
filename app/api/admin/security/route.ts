import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/server-auth";
import { createAdminAuditEvent, type AdminAuditSeverity } from "@/lib/admin/audit-log";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    await authorizeRequest(request, ["admin"]);

    const snapshot = await getAdminDb()
      .collection("admin_audit_events")
      .orderBy("createdAt", "desc")
      .limit(300)
      .get();

    const events = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      actorUid: String(docSnap.data().actorUid ?? "unknown"),
      actorRole: String(docSnap.data().actorRole ?? "unknown"),
      action: String(docSnap.data().action ?? "unknown_action"),
      target: String(docSnap.data().target ?? "unknown_target"),
      detail: String(docSnap.data().detail ?? ""),
      severity: String(docSnap.data().severity ?? "info"),
      createdAt: String(docSnap.data().createdAt ?? ""),
    }));

    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    const body = (await request.json()) as {
      action?: string;
      target?: string;
      detail?: string;
      severity?: AdminAuditSeverity;
    };

    const action = body.action?.trim() || "manual_event";
    const target = body.target?.trim() || "admin_console";
    const detail = body.detail?.trim() || "Manual admin security event";
    const severity =
      body.severity === "critical" || body.severity === "warning" || body.severity === "info"
        ? body.severity
        : "info";

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action,
      target,
      detail,
      severity,
    });

    return NextResponse.json({ status: "logged" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
