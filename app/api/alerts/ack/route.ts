import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/server-auth";
import { createAdminAuditEvent } from "@/lib/admin/audit-log";
import { getAdminDb } from "@/lib/firebase/admin";

function normalizeAlertId(alertId: string) {
  return alertId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
}

export async function GET(request: NextRequest) {
  try {
    await authorizeRequest(request, ["viewer", "operator", "admin"]);

    const snapshot = await getAdminDb()
      .collection("alert_acknowledgements")
      .orderBy("updatedAt", "desc")
      .limit(250)
      .get();

    const acknowledgements = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      alertId: docSnap.data().alertId as string,
      acknowledgedBy: docSnap.data().acknowledgedBy as string,
      acknowledgedAt: docSnap.data().acknowledgedAt as string,
      updatedAt: docSnap.data().updatedAt as string,
      severity: docSnap.data().severity as string,
      title: docSnap.data().title as string,
    }));

    return NextResponse.json({ acknowledgements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["operator", "admin"]);
    const body = (await request.json()) as {
      alertId?: string;
      severity?: string;
      title?: string;
    };

    const alertId = body.alertId?.trim();
    const severity = body.severity?.trim() ?? "Warning";
    const title = body.title?.trim() ?? "Untitled alert";

    if (!alertId) {
      return NextResponse.json({ error: "alertId is required" }, { status: 400 });
    }

    const docId = normalizeAlertId(alertId);
    const now = new Date().toISOString();

    await getAdminDb().collection("alert_acknowledgements").doc(docId).set(
      {
        alertId,
        severity,
        title,
        acknowledgedBy: authUser.uid,
        acknowledgedAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "acknowledge_alert",
      target: alertId,
      detail: `Acknowledged '${title}' (${severity})`,
      severity: severity.toLowerCase() === "critical" ? "critical" : "warning",
    });

    return NextResponse.json({ status: "acknowledged", alertId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
