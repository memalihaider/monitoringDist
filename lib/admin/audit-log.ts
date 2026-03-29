import { getAdminDb } from "@/lib/firebase/admin";

export type AdminAuditSeverity = "info" | "warning" | "critical";

export type AdminAuditEventInput = {
  actorUid: string;
  actorRole: string;
  action: string;
  target: string;
  detail?: string;
  severity?: AdminAuditSeverity;
};

function buildEventId() {
  const now = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `${now}_${random}`;
}

export async function createAdminAuditEvent(input: AdminAuditEventInput) {
  const nowIso = new Date().toISOString();
  await getAdminDb()
    .collection("admin_audit_events")
    .doc(buildEventId())
    .set({
      actorUid: input.actorUid,
      actorRole: input.actorRole,
      action: input.action,
      target: input.target,
      detail: input.detail ?? "",
      severity: input.severity ?? "info",
      createdAt: nowIso,
      updatedAt: nowIso,
    });
}
