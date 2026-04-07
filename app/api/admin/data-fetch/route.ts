import { NextRequest, NextResponse } from "next/server";
import { createAdminAuditEvent } from "@/lib/admin/audit-log";
import { authorizeRequest } from "@/lib/auth/server-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { queryPrometheus } from "@/lib/prometheus/client";
import { probeWebsite } from "@/lib/prometheus/website-probe";
import { resolvePrometheusQueryByKey } from "@/lib/prometheus/query-resolver";

type FetchJobInput = {
  source?: "prometheus" | "firestore";
  queryKey?: string;
  projectId?: string;
  collectionName?: string;
  limit?: number;
};

const ALLOWED_COLLECTIONS = new Set([
  "admin_services",
  "admin_docs",
  "admin_reports",
  "admin_audit_events",
  "admin_prometheus_queries",
  "alert_acknowledgements",
  "doc_notes",
  "user_roles",
]);

function toIsoString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).toISOString();
  }
  return new Date(0).toISOString();
}

function clampLimit(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 25;
  }
  return Math.max(1, Math.min(200, Math.floor(value)));
}

function stringifyPreview(value: unknown) {
  if (Array.isArray(value)) {
    return JSON.stringify(value.slice(0, 20), null, 2);
  }
  return JSON.stringify(value, null, 2);
}

export async function GET(request: NextRequest) {
  try {
    await authorizeRequest(request, ["admin"]);
    const snapshot = await getAdminDb()
      .collection("admin_data_fetch_jobs")
      .orderBy("createdAt", "desc")
      .limit(120)
      .get();

    const jobs = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as {
        source?: string;
        queryKey?: string;
        projectId?: string;
        projectName?: string;
        collectionName?: string;
        status?: string;
        resultCount?: number;
        preview?: string;
        error?: string;
        createdAt?: unknown;
        createdBy?: string;
      };
      return {
        id: docSnap.id,
        source: data.source ?? "unknown",
        queryKey: data.queryKey ?? "",
        projectId: data.projectId ?? "",
        projectName: data.projectName ?? "",
        collectionName: data.collectionName ?? "",
        status: data.status ?? "unknown",
        resultCount: typeof data.resultCount === "number" ? data.resultCount : 0,
        preview: data.preview ?? "",
        error: data.error ?? "",
        createdAt: toIsoString(data.createdAt),
        createdBy: data.createdBy ?? "",
      };
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    const body = (await request.json()) as FetchJobInput;
    const source = body.source;

    if (source !== "prometheus" && source !== "firestore") {
      return NextResponse.json({ error: "source must be prometheus or firestore" }, { status: 400 });
    }

    let resultCount = 0;
    let preview = "";
    let queryKey = "";
    let projectId = body.projectId?.trim() ?? "";
    let projectName = "";
    let collectionName = "";

    if (source === "prometheus") {
      if (projectId) {
        const projectSnap = await getAdminDb().collection("admin_monitoring_projects").doc(projectId).get();
        if (!projectSnap.exists) {
          return NextResponse.json({ error: "project not found" }, { status: 404 });
        }

        const projectData = projectSnap.data() as {
          name?: string;
          prometheusQuery?: string;
          targetUrl?: string;
        };
        projectName = projectData.name?.trim() ?? "";
        queryKey = body.queryKey?.trim() ?? projectData.prometheusQuery?.trim() ?? "up";
      } else {
        queryKey = body.queryKey?.trim() ?? "";
      }

      if (!queryKey) {
        return NextResponse.json(
          { error: "queryKey is required for Prometheus source when project has no query" },
          { status: 400 },
        );
      }

      const resolved = await resolvePrometheusQueryByKey(getAdminDb(), queryKey);
      const result = await queryPrometheus(resolved?.promQl ?? queryKey);
      resultCount = Array.isArray(result.result) ? result.result.length : 0;

      if (resultCount === 0 && projectId) {
        const projectSnap = await getAdminDb().collection("admin_monitoring_projects").doc(projectId).get();
        const projectData = (projectSnap.data() ?? {}) as {
          name?: string;
          targetUrl?: string;
          description?: string;
          expectedMetrics?: string[];
        };

        if (projectData.targetUrl?.trim()) {
          try {
            const probe = await probeWebsite(projectData.targetUrl.trim());
            const fallbackRows = [
              {
                projectId,
                projectName: projectData.name ?? "Project",
                description: projectData.description ?? "",
                metricSource: "website_probe_fallback",
                targetUrl: projectData.targetUrl,
                expectedMetrics: Array.isArray(projectData.expectedMetrics)
                  ? projectData.expectedMetrics
                  : [],
                probeStatus: probe.available ? "up" : "down",
                responseTimeMs: probe.responseTimeMs,
                statusCode: probe.statusCode,
                checkedAt: probe.checkedAt,
                note: "Prometheus returned no rows, showing real-time probe fallback data.",
              },
            ];

            resultCount = fallbackRows.length;
            preview = stringifyPreview(fallbackRows);

            await getAdminDb().collection("admin_monitoring_projects").doc(projectId).set(
              {
                lastProbeStatus: probe.available ? "up" : "down",
                lastProbeAt: probe.checkedAt,
                lastProbeLatencyMs: probe.responseTimeMs,
                updatedAt: new Date().toISOString(),
                updatedBy: authUser.uid,
              },
              { merge: true },
            );
          } catch {
            preview = stringifyPreview(result.result ?? []);
          }
        } else {
          preview = stringifyPreview(result.result ?? []);
        }
      } else {
        preview = stringifyPreview(result.result ?? []);
      }
    }

    if (source === "firestore") {
      collectionName = body.collectionName?.trim() ?? "";
      if (!collectionName || !ALLOWED_COLLECTIONS.has(collectionName)) {
        return NextResponse.json({ error: "collectionName is not allowed" }, { status: 400 });
      }

      const take = clampLimit(body.limit);
      const snapshot = await getAdminDb().collection(collectionName).limit(take).get();
      const rows = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      resultCount = rows.length;
      preview = stringifyPreview(rows);
    }

    const now = new Date().toISOString();
    const docRef = getAdminDb().collection("admin_data_fetch_jobs").doc();
    await docRef.set({
      source,
      queryKey,
      projectId,
      projectName,
      collectionName,
      status: "success",
      resultCount,
      preview,
      error: "",
      createdAt: now,
      createdBy: authUser.uid,
    });

    if (source === "prometheus" && projectId) {
      const now = new Date().toISOString();
      await getAdminDb().collection("admin_reports").add({
        title: `${projectName || "Project"} - Monitoring Fetch`,
        description: `Auto-generated from data fetch job ${docRef.id}`,
        format: "json",
        sourceType: "prometheus",
        queryKey,
        projectId,
        projectName,
        content: preview,
        status: "ready",
        generatedAt: now,
        generatedPreview: preview,
        updatedAt: now,
        updatedBy: authUser.uid,
        createdAt: now,
      });
    }

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "run_data_fetch",
      target: docRef.id,
      detail: `source=${source}, project=${projectName || projectId || "n/a"}, queryKey=${queryKey || "n/a"}, collection=${collectionName || "n/a"}, count=${resultCount}`,
      severity: "info",
    });

    return NextResponse.json({
      status: "success",
      job: {
        id: docRef.id,
        source,
        queryKey,
        projectId,
        projectName,
        collectionName,
        resultCount,
        preview,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";

    if (message === "Insufficient permissions") {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
