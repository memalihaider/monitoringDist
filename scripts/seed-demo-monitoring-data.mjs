import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getAdminConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
    );
  }

  return { projectId, clientEmail, privateKey };
}

const DEMO_UPDATED_BY = "seed-demo-monitoring-data-script";

const DEMO_SERVICES = [
  {
    serviceKey: "api-gateway",
    name: "API Gateway",
    description: "Routes incoming traffic and applies auth policies.",
    ownerTeam: "Platform",
    environment: "Production",
    runbookUrl: "https://demo.example.com/runbooks/api-gateway",
    dashboardUrl: "https://demo.example.com/dashboards/api-gateway",
    statusNote: "Healthy under normal traffic.",
    enabled: true,
  },
  {
    serviceKey: "payments-service",
    name: "Payments Service",
    description: "Processes card and wallet transactions.",
    ownerTeam: "FinOps",
    environment: "Production",
    runbookUrl: "https://demo.example.com/runbooks/payments-service",
    dashboardUrl: "https://demo.example.com/dashboards/payments-service",
    statusNote: "Monitoring latency and retries.",
    enabled: true,
  },
  {
    serviceKey: "notification-service",
    name: "Notification Service",
    description: "Sends transactional email and SMS notifications.",
    ownerTeam: "Comms",
    environment: "Production",
    runbookUrl: "https://demo.example.com/runbooks/notification-service",
    dashboardUrl: "https://demo.example.com/dashboards/notification-service",
    statusNote: "Simulated degraded state for demo alerts.",
    enabled: true,
  },
];

const DEMO_QUERIES = [
  {
    key: "customer_demo_error_rate",
    label: "Customer Demo Error Rate",
    description: "Demo query for customer presentations.",
    promQl: 'sum(rate(http_requests_total{status=~"5.."}[5m]))',
    enabled: true,
  },
  {
    key: "customer_demo_latency_p95",
    label: "Customer Demo Latency P95",
    description: "P95 latency trend for customer demo.",
    promQl: "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
    enabled: true,
  },
];

const DEMO_REPORTS = [
  {
    title: "Executive Monitoring Snapshot",
    description: "Weekly high-level operational summary for customer stakeholders.",
    format: "summary",
    sourceType: "manual",
    queryKey: "",
    content:
      "System uptime remained stable across core services. One non-critical notification service issue was acknowledged and recovered.",
    status: "ready",
  },
  {
    title: "Prometheus Alert Health Demo",
    description: "Generated from Prometheus alert query to demonstrate live report generation.",
    format: "json",
    sourceType: "prometheus",
    queryKey: "alerts",
    content: "",
    status: "draft",
  },
];

const DEMO_ACKS = [
  {
    alertId: "HighCPUUsage",
    title: "High CPU usage on API Gateway",
    severity: "Critical",
    acknowledgedBy: "operator.test@monitordistribution.local",
  },
  {
    alertId: "LatencyP95High",
    title: "Latency p95 above threshold",
    severity: "Warning",
    acknowledgedBy: "admin.test@monitordistribution.local",
  },
];

async function upsertByField(collectionRef, field, value, payload) {
  const existing = await collectionRef.where(field, "==", value).limit(1).get();
  const now = new Date().toISOString();

  if (existing.empty) {
    const created = {
      ...payload,
      createdAt: now,
      updatedAt: now,
      updatedBy: DEMO_UPDATED_BY,
    };
    const docRef = collectionRef.doc();
    await docRef.set(created);
    return { id: docRef.id, action: "created" };
  }

  const docRef = existing.docs[0].ref;
  await docRef.set(
    {
      ...payload,
      updatedAt: now,
      updatedBy: DEMO_UPDATED_BY,
    },
    { merge: true },
  );
  return { id: docRef.id, action: "updated" };
}

async function seedDemoMonitoringData() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));

  const { projectId, clientEmail, privateKey } = getAdminConfig();
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });

  const db = getFirestore(app);

  const summary = [];

  for (const service of DEMO_SERVICES) {
    const result = await upsertByField(db.collection("admin_services"), "serviceKey", service.serviceKey, service);
    summary.push({ collection: "admin_services", key: service.serviceKey, ...result });
  }

  for (const query of DEMO_QUERIES) {
    const result = await upsertByField(db.collection("admin_prometheus_queries"), "key", query.key, query);
    summary.push({ collection: "admin_prometheus_queries", key: query.key, ...result });
  }

  for (const report of DEMO_REPORTS) {
    const result = await upsertByField(db.collection("admin_reports"), "title", report.title, {
      ...report,
      generatedAt: report.status === "ready" ? new Date().toISOString() : "",
      generatedPreview:
        report.sourceType === "prometheus"
          ? "Pending generation. Use Generate action in Reports page."
          : report.content,
    });
    summary.push({ collection: "admin_reports", key: report.title, ...result });
  }

  for (const ack of DEMO_ACKS) {
    const result = await upsertByField(db.collection("alert_acknowledgements"), "alertId", ack.alertId, {
      ...ack,
      acknowledgedAt: new Date().toISOString(),
    });
    summary.push({ collection: "alert_acknowledgements", key: ack.alertId, ...result });
  }

  console.log("\nDemo monitoring data is ready:\n");
  console.table(summary);
  console.log("\nTip: set PROMETHEUS_DEMO_MODE=true in .env.local for demo metric responses.\n");
}

seedDemoMonitoringData().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Failed to seed demo monitoring data:", message);
  process.exitCode = 1;
});