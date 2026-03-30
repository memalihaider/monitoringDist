import type { Firestore } from "firebase-admin/firestore";
import { queryPrometheus } from "@/lib/prometheus/client";

type PrometheusVectorResult = {
  metric: Record<string, string>;
  value: [number, string];
};

export type ManualServiceRecord = {
  id: string;
  serviceKey: string;
  name: string;
  description: string;
  ownerTeam: string;
  environment: string;
  runbookUrl: string;
  dashboardUrl: string;
  statusNote: string;
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
};

export type CatalogService = {
  id: string;
  source: "manual" | "prometheus";
  serviceKey: string;
  name: string;
  description: string;
  ownerTeam: string;
  environment: string;
  runbookUrl: string;
  dashboardUrl: string;
  statusNote: string;
  status: "Running" | "Stopped" | "Unknown";
  enabled: boolean;
  updatedAt: string;
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

function normalizeServiceKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseManualService(docId: string, value: unknown): ManualServiceRecord | null {
  const data = (value ?? {}) as {
    serviceKey?: string;
    name?: string;
    description?: string;
    ownerTeam?: string;
    environment?: string;
    runbookUrl?: string;
    dashboardUrl?: string;
    statusNote?: string;
    enabled?: boolean;
    updatedAt?: unknown;
    updatedBy?: string;
  };

  const serviceKey = normalizeServiceKey(data.serviceKey ?? "");
  const name = data.name?.trim() ?? "";

  if (!serviceKey || !name) {
    return null;
  }

  return {
    id: docId,
    serviceKey,
    name,
    description: data.description?.trim() ?? "",
    ownerTeam: data.ownerTeam?.trim() ?? "",
    environment: data.environment?.trim() ?? "",
    runbookUrl: data.runbookUrl?.trim() ?? "",
    dashboardUrl: data.dashboardUrl?.trim() ?? "",
    statusNote: data.statusNote?.trim() ?? "",
    enabled: data.enabled !== false,
    updatedAt: toIsoString(data.updatedAt),
    updatedBy: data.updatedBy?.trim() ?? "",
  };
}

function toStatus(value: string) {
  if (value === "1") {
    return "Running" as const;
  }
  if (value === "0") {
    return "Stopped" as const;
  }
  return "Unknown" as const;
}

async function loadPrometheusStatuses() {
  const rows = (await queryPrometheus("min by (job) (up)").catch(() => null))
    ?.result as PrometheusVectorResult[] | undefined;

  const statusByServiceKey = new Map<string, { status: "Running" | "Stopped" | "Unknown"; name: string }>();

  for (const row of rows ?? []) {
    const job = normalizeServiceKey(row.metric.job ?? "");
    if (!job) {
      continue;
    }

    statusByServiceKey.set(job, {
      status: toStatus(row.value[1]),
      name: row.metric.job ?? row.metric.instance ?? job,
    });
  }

  return statusByServiceKey;
}

export async function loadServicesCatalog(db: Firestore) {
  const [manualSnapshot, prometheusStatuses] = await Promise.all([
    db.collection("admin_services").orderBy("updatedAt", "desc").limit(300).get(),
    loadPrometheusStatuses(),
  ]);

  const manualRecords = manualSnapshot.docs
    .map((docSnap) => parseManualService(docSnap.id, docSnap.data()))
    .filter((entry): entry is ManualServiceRecord => entry !== null);

  const catalog: CatalogService[] = [];
  const seenServiceKeys = new Set<string>();

  for (const manual of manualRecords) {
    const auto = prometheusStatuses.get(manual.serviceKey);
    seenServiceKeys.add(manual.serviceKey);

    catalog.push({
      id: manual.id,
      source: "manual",
      serviceKey: manual.serviceKey,
      name: manual.name,
      description: manual.description,
      ownerTeam: manual.ownerTeam,
      environment: manual.environment,
      runbookUrl: manual.runbookUrl,
      dashboardUrl: manual.dashboardUrl,
      statusNote: manual.statusNote,
      status: auto?.status ?? "Unknown",
      enabled: manual.enabled,
      updatedAt: manual.updatedAt,
    });
  }

  for (const [serviceKey, auto] of prometheusStatuses.entries()) {
    if (seenServiceKeys.has(serviceKey)) {
      continue;
    }

    catalog.push({
      id: `auto:${serviceKey}`,
      source: "prometheus",
      serviceKey,
      name: auto.name,
      description: "Auto-discovered from Prometheus job labels.",
      ownerTeam: "",
      environment: "",
      runbookUrl: "",
      dashboardUrl: "",
      statusNote: "",
      status: auto.status,
      enabled: true,
      updatedAt: new Date(0).toISOString(),
    });
  }

  catalog.sort((a, b) => a.name.localeCompare(b.name));

  return {
    services: catalog,
    manualServices: manualRecords,
    autoServiceCount: prometheusStatuses.size,
  };
}

export function normalizeServiceInputKey(value: string) {
  return normalizeServiceKey(value);
}
