import { NextRequest, NextResponse } from "next/server";
import { createAdminAuditEvent } from "@/lib/admin/audit-log";
import { authorizeRequest, requireSuperAdmin } from "@/lib/auth/server-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { queryPrometheus } from "@/lib/prometheus/client";
import { resolvePrometheusQueryByKey } from "@/lib/prometheus/query-resolver";

type ReportFormat = "csv" | "json" | "summary";
type ReportSource = "manual" | "prometheus";

type ReportInput = {
  id?: string;
  title?: string;
  description?: string;
  format?: ReportFormat;
  sourceType?: ReportSource;
  queryKey?: string;
  content?: string;
  status?: "draft" | "ready";
  action?: "generate";
};

function toIsoString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).toISOString();
  }
  return new Date(0).toISOString();
}

function normalizeReportPayload(input: ReportInput) {
  const title = input.title?.trim() ?? "";
  if (!title) {
    return null;
  }

  const format = input.format === "csv" || input.format === "json" || input.format === "summary" ? input.format : "summary";
  const sourceType = input.sourceType === "prometheus" || input.sourceType === "manual" ? input.sourceType : "manual";
  const status = input.status === "ready" ? "ready" : "draft";

  return {
    title,
    description: input.description?.trim() ?? "",
    format,
    sourceType,
    queryKey: input.queryKey?.trim() ?? "",
    content: input.content?.trim() ?? "",
    status,
  };
}

function buildSamplePreview(value: unknown) {
  const rows = value as Array<Record<string, unknown>>;
  const sample = Array.isArray(rows) ? rows.slice(0, 20) : value;
  return JSON.stringify(sample, null, 2);
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);

    const snapshot = await getAdminDb()
      .collection("admin_reports")
      .orderBy("updatedAt", "desc")
      .limit(300)
      .get();

    const reports = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as {
          title?: string;
          description?: string;
          format?: ReportFormat;
          sourceType?: ReportSource;
          queryKey?: string;
          content?: string;
          status?: "draft" | "ready";
          generatedAt?: unknown;
          generatedPreview?: string;
          updatedAt?: unknown;
        };

        if (!data.title) {
          return null;
        }

        return {
          id: docSnap.id,
          title: data.title,
          description: data.description ?? "",
          format: data.format ?? "summary",
          sourceType: data.sourceType ?? "manual",
          queryKey: data.queryKey ?? "",
          content: data.content ?? "",
          status: data.status ?? "draft",
          generatedAt: data.generatedAt ? toIsoString(data.generatedAt) : "",
          generatedPreview: data.generatedPreview ?? "",
          updatedAt: toIsoString(data.updatedAt),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return NextResponse.json({ reports, canDelete: authUser.isSuperAdmin });
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
    const body = (await request.json()) as ReportInput;
    const payload = normalizeReportPayload(body);

    if (!payload) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const docRef = getAdminDb().collection("admin_reports").doc();
    await docRef.set({
      ...payload,
      createdAt: now,
      updatedAt: now,
      updatedBy: authUser.uid,
      generatedAt: "",
      generatedPreview: "",
    });

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "create_report",
      target: docRef.id,
      detail: `Created report ${payload.title}`,
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
    const body = (await request.json()) as ReportInput;
    const id = body.id?.trim();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (body.action === "generate") {
      const ref = getAdminDb().collection("admin_reports").doc(id);
      const docSnap = await ref.get();

      if (!docSnap.exists) {
        return NextResponse.json({ error: "report not found" }, { status: 404 });
      }

      const data = docSnap.data() as {
        sourceType?: ReportSource;
        queryKey?: string;
        title?: string;
      };

      let generatedPreview = "";
      if (data.sourceType === "prometheus" && data.queryKey) {
        const resolved = await resolvePrometheusQueryByKey(getAdminDb(), data.queryKey);
        if (!resolved) {
          return NextResponse.json({ error: "queryKey is not available" }, { status: 400 });
        }
        const result = await queryPrometheus(resolved.promQl);
        generatedPreview = buildSamplePreview(result.result);
      } else {
        generatedPreview = `Manual report generated at ${new Date().toISOString()}`;
      }

      await ref.set(
        {
          status: "ready",
          generatedAt: new Date().toISOString(),
          generatedPreview,
          updatedAt: new Date().toISOString(),
          updatedBy: authUser.uid,
        },
        { merge: true },
      );

      await createAdminAuditEvent({
        actorUid: authUser.uid,
        actorRole: authUser.role,
        action: "generate_report",
        target: id,
        detail: `Generated report ${data.title ?? id}`,
        severity: "warning",
      });

      return NextResponse.json({ status: "generated", id });
    }

    const payload = normalizeReportPayload(body);
    if (!payload) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    await getAdminDb().collection("admin_reports").doc(id).set(
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
      action: "update_report",
      target: id,
      detail: `Updated report ${payload.title}`,
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

    await getAdminDb().collection("admin_reports").doc(id).delete();

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "delete_report",
      target: id,
      detail: "Deleted report",
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
