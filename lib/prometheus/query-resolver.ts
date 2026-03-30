import type { Firestore } from "firebase-admin/firestore";
import {
  BUILT_IN_PROMETHEUS_QUERIES,
  normalizePrometheusQueryKey,
} from "@/lib/prometheus/query-catalog";

export type ResolvedPrometheusQuery = {
  id: string;
  key: string;
  label: string;
  description: string;
  promQl: string;
  source: "builtin" | "custom";
  editable: boolean;
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

export async function listResolvedPrometheusQueries(db: Firestore) {
  const snapshot = await db
    .collection("admin_prometheus_queries")
    .orderBy("updatedAt", "desc")
    .limit(250)
    .get();

  const customQueries = snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() as {
        key?: string;
        label?: string;
        description?: string;
        promQl?: string;
        enabled?: boolean;
        updatedAt?: unknown;
      };

      const key = normalizePrometheusQueryKey(data.key ?? "");
      const label = data.label?.trim() ?? "";
      const promQl = data.promQl?.trim() ?? "";

      if (!key || !label || !promQl) {
        return null;
      }

      return {
        id: docSnap.id,
        key,
        label,
        description: data.description?.trim() ?? "",
        promQl,
        source: "custom" as const,
        editable: true,
        enabled: data.enabled !== false,
        updatedAt: toIsoString(data.updatedAt),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const customByKey = new Map(customQueries.map((query) => [query.key, query]));

  const builtInQueries: ResolvedPrometheusQuery[] = BUILT_IN_PROMETHEUS_QUERIES.map((query) => {
    const custom = customByKey.get(query.key);
    if (custom) {
      return {
        ...custom,
        source: "custom",
        editable: true,
      };
    }

    return {
      id: `builtin:${query.key}`,
      key: query.key,
      label: query.label,
      description: query.description,
      promQl: query.promQl,
      source: "builtin",
      editable: false,
      enabled: true,
      updatedAt: new Date(0).toISOString(),
    };
  });

  const onlyCustom = customQueries.filter(
    (query) => !BUILT_IN_PROMETHEUS_QUERIES.some((builtIn) => builtIn.key === query.key),
  );

  return [...builtInQueries, ...onlyCustom];
}

export async function resolvePrometheusQueryByKey(db: Firestore, keyInput: string) {
  const key = normalizePrometheusQueryKey(keyInput);
  if (!key) {
    return null;
  }

  const customSnapshot = await db
    .collection("admin_prometheus_queries")
    .where("key", "==", key)
    .limit(1)
    .get();

  if (!customSnapshot.empty) {
    const customDoc = customSnapshot.docs[0];
    const customData = customDoc.data() as {
      label?: string;
      description?: string;
      promQl?: string;
      enabled?: boolean;
      updatedAt?: unknown;
    };

    const promQl = customData.promQl?.trim() ?? "";
    if (promQl && customData.enabled !== false) {
      return {
        id: customDoc.id,
        key,
        label: customData.label?.trim() ?? key,
        description: customData.description?.trim() ?? "",
        promQl,
        source: "custom" as const,
        editable: true,
        enabled: true,
        updatedAt: toIsoString(customData.updatedAt),
      } satisfies ResolvedPrometheusQuery;
    }

    if (customData.enabled === false) {
      return null;
    }
  }

  const builtIn = BUILT_IN_PROMETHEUS_QUERIES.find((entry) => entry.key === key);
  if (!builtIn) {
    return null;
  }

  return {
    id: `builtin:${builtIn.key}`,
    key: builtIn.key,
    label: builtIn.label,
    description: builtIn.description,
    promQl: builtIn.promQl,
    source: "builtin",
    editable: false,
    enabled: true,
    updatedAt: new Date(0).toISOString(),
  } satisfies ResolvedPrometheusQuery;
}
