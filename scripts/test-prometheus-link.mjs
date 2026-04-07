import fs from "node:fs";
import path from "node:path";
import process from "node:process";

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

function getAuthHeader() {
  const bearerToken = process.env.PROMETHEUS_BEARER_TOKEN?.trim();
  if (bearerToken) {
    return `Bearer ${bearerToken}`;
  }

  const username = process.env.PROMETHEUS_BASIC_AUTH_USERNAME?.trim();
  const password = process.env.PROMETHEUS_BASIC_AUTH_PASSWORD;
  if (username && typeof password === "string") {
    return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
  }

  return null;
}

async function query(baseUrl, queryText, authHeader) {
  const url = new URL("/api/v1/query", baseUrl);
  url.searchParams.set("query", queryText);

  const headers = {};
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  return {
    status: response.status,
    ok: response.ok,
    payload,
    url: url.toString(),
  };
}

async function run() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));

  const baseUrl = process.env.PROMETHEUS_BASE_URL;
  const authHeader = getAuthHeader();

  if (!baseUrl) {
    throw new Error("PROMETHEUS_BASE_URL is missing in .env.local or environment.");
  }

  console.log("\nTesting Prometheus connection...");
  console.log(`Base URL: ${baseUrl}`);

  const checks = [
    { name: "up", query: "up" },
    { name: "min_up_by_job", query: "min by (job) (up)" },
    { name: "alerts", query: "ALERTS" },
  ];

  const summary = [];

  for (const check of checks) {
    const result = await query(baseUrl, check.query, authHeader);
    const rows = Array.isArray(result.payload?.data?.result) ? result.payload.data.result.length : 0;

    summary.push({
      check: check.name,
      httpStatus: result.status,
      ok: result.ok,
      results: rows,
      status: result.payload?.status ?? "unknown",
    });

    if (!result.ok || result.payload?.status !== "success") {
      console.error("\nPrometheus check failed:");
      console.error(`- Check: ${check.name}`);
      console.error(`- URL: ${result.url}`);
      console.error(`- HTTP: ${result.status}`);
      console.error(`- Error: ${result.payload?.error ?? "Unknown error"}`);
      process.exitCode = 1;
      return;
    }
  }

  console.log("\nPrometheus link test passed.\n");
  console.table(summary);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Prometheus link test failed:", message);
  process.exitCode = 1;
});