# Prometheus Testing Report

Date: 2026-04-07
Environment: Local real-time Prometheus on http://localhost:9090
Project: monitoring_solutions

## 1) Test Objective

Validate that the monitoring stack is connected to a live Prometheus instance and that baseline operational queries return valid data for dashboards and API consumers.

## 2) Test Data Collected

The following live data files were generated from Prometheus:

- reports/prometheus_up.json
- reports/prometheus_min_up_by_job.json
- reports/prometheus_alerts.json
- reports/prometheus_scrape_duration_by_job.json
- reports/prometheus_targets.json
- reports/prometheus_up_range_1h.json

## 3) Result Summary

- Query up: prometheus:1
- Query min_up_by_job: prometheus:1
- Query ALERTS: 0 active alerts
- Active targets: 1
- Range data points for up over 1h (step 60s): 5

Interpretation:

- Value 1 for up means the target is healthy and reachable.
- min_up_by_job of 1 confirms no outage for the prometheus job in the sampled instant.
- 0 alerts means no currently firing alert rules in this local setup.
- Active target count 1 confirms scrape pipeline is functioning.

## 4) Complete Test Procedure

1. Ensure real mode is enabled in .env.local:
   - PROMETHEUS_DEMO_MODE=false
   - PROMETHEUS_BASE_URL=http://localhost:9090
2. Ensure Prometheus is running and healthy:
   - curl http://localhost:9090/-/healthy
3. Run project connectivity test:
   - npm run prometheus:test-link
4. Collect raw test artifacts:
   - curl to /api/v1/query and /api/v1/query_range endpoints
5. Validate query outputs:
   - up returns value 1
   - min by (job) (up) returns 1 for active jobs
   - ALERTS returns empty array or expected alert rows
   - targets endpoint returns at least one active target

## 5) How To Use In Your App

### A) Existing app query route (preset catalog)

Use the route:

- GET /api/prometheus/query?q=up
- GET /api/prometheus/query?q=min_up_by_job
- GET /api/prometheus/query?q=alerts

Purpose:

- Uses approved query keys from your internal catalog.
- Best for dashboard widgets and controlled use cases.

### B) New raw proxy routes (custom runtime analysis)

Use routes:

- GET /api/prometheus/raw/query?query=up
- GET /api/prometheus/raw/query-range?query=up&start=<epoch>&end=<epoch>&step=30s
- GET /api/prometheus/raw/targets

Purpose:

- Directly query Prometheus API through your backend.
- Best for exploratory or advanced panel/reporting use.

### C) Authentication options for Prometheus backend

Supported environment configuration:

- Bearer token:
  - PROMETHEUS_BEARER_TOKEN
- Basic Auth:
  - PROMETHEUS_BASIC_AUTH_USERNAME
  - PROMETHEUS_BASIC_AUTH_PASSWORD

Behavior:

- If bearer token is present, it is used.
- Otherwise, basic auth is used when both username and password are present.

## 6) Example Operational Checks

- Availability panel: use up and min_up_by_job every 15 to 30 seconds.
- Latency panel: use scrape_duration_by_job query to track scrape responsiveness.
- Alerts panel: use alerts query to drive operator and viewer alert pages.
- Incident diagnosis: use query-range for recent 1h to 24h windows.

## 7) Pass/Fail Status

Status: PASS

Reason:

- Live Prometheus health endpoint reachable.
- Core test-link script passed.
- Mandatory baseline queries returned successful responses.
- Active target available and healthy.

## 8) Notes

- ALERTS=0 is expected in minimal local setup without firing rules.
- For production-like testing, add exporter targets and alerting rules to increase data variety.
