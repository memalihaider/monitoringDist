# Complete Portal Guide

## Purpose

This document explains how the portal works end-to-end and how to use each page by role.

## 1) How The Portal Works

The system uses role-based access control with three main roles:

- admin: full control and configuration
- operator: operational monitoring and alert response
- viewer: read-only visibility

Core behavior:

- Login is handled at /login.
- Shared routes like /dashboard, /alerts, /services, /docs, /reports, /settings redirect users to their role-specific pages.
- Backend APIs enforce access through server-side authorization checks.
- Prometheus data can run in demo mode or real mode.

## 2) Role Navigation Model

After authentication, users are redirected based on role:

- admin: management and system operations
- operator: runbook-style operations
- viewer: read-only monitoring

## 3) Common Entry Routes

### /
Use: Main landing page and high-level portal entry.

### /login
Use: Sign in to access role-protected portal pages.

### /dashboard
Use: Role redirect route. Sends users to their role-specific dashboard flow.

### /alerts
Use: Role redirect route to alert page by role.

### /services
Use: Role redirect route to service page by role.

### /docs
Use: Role redirect route to docs page by role.

### /reports
Use: Role redirect route to reports page by role.

### /settings
Use: Role redirect route to settings page by role.

## 4) Admin Portal Pages (/admin)

### /admin/dashboard
Use: View executive and operational KPIs.

What you do here:

- monitor user counts, role distribution, events, and telemetry health
- get a quick system pulse before deep-dive operations

### /admin/users
Use: Create and manage users, roles, and permissions.

What you do here:

- create users
- assign role: admin/operator/viewer
- update role access

### /admin/audit
Use: Track and review audit records.

What you do here:

- inspect who changed what and when
- verify policy and governance activity

### /admin/security
Use: View security-related events.

What you do here:

- inspect suspicious actions and permission events
- validate security posture and event severity

### /admin/settings
Use: Configure global system behavior.

What you do here:

- tune maintenance mode
- tune telemetry refresh controls
- define docs write role and alert sensitivity behavior

### /admin/alerts
Use: Manage and acknowledge active alerts.

What you do here:

- inspect alert queue
- acknowledge alerts for incident workflow

### /admin/services
Use: Manage monitored services catalog.

What you do here:

- create/update/delete service metadata
- maintain team owner, environment, runbook links, dashboard links

### /admin/projects
Use: Create monitoring projects for external systems.

What you do here:

- create project entries for websites, APIs, databases, or infrastructure systems
- attach target URL and expected metrics per project
- set a Prometheus query per project for focused metric review
- run website probe per project and store latest probe status and latency

### /admin/prometheus
Use: Prometheus control center.

What you do here:

- run approved query presets
- create/edit/delete custom query catalog entries
- check connection status, latency, and result rows
- probe website URLs through the website monitoring panel

### /admin/data-fetch
Use: Pull data from Prometheus and store snapshots.

What you do here:

- run data sync jobs
- persist fetched metrics to storage for downstream reports

### /admin/advanced
Use: Diagnostic and advanced operations.

What you do here:

- run diagnostics
- run advanced actions and validations

### /admin/synthetic-alerts
Use: Generate test alerts for validation and demos.

What you do here:

- create synthetic scenarios
- test alert workflows and response paths safely

### /admin/docs
Use: Manage documentation content.

What you do here:

- create/edit/publish managed docs
- maintain knowledge base content

### /admin/reports
Use: Build monitoring reports.

What you do here:

- generate report records from fetched metrics
- export data (CSV/JSON/PDF flows where configured)

## 5) Operator Portal Pages (/operator)

### /operator/dashboard
Use: Operational real-time monitoring dashboard.

What you do here:

- monitor service status and core metrics
- track alerts for active operations

### /operator/alerts
Use: Alert operations and acknowledgment workflow.

What you do here:

- review active alerts
- acknowledge alerts with operator accountability trail

### /operator/services
Use: Monitor service list and health context.

What you do here:

- search services
- verify runtime status and ownership context

### /operator/docs
Use: Access operational knowledge base.

What you do here:

- read procedures and runbooks
- support incident response and maintenance tasks

### /operator/reports
Use: Consume operations reports.

### /operator/settings
Use: Role-scoped settings page.

## 6) Viewer Portal Pages (/viewer)

### /viewer/dashboard
Use: Read-only monitoring overview.

### /viewer/alerts
Use: Read-only active alerts stream.

### /viewer/services
Use: Read-only services inventory.

### /viewer/docs
Use: Read-only documentation and chapters.

### /viewer/reports
Use: Read-only report access.

### /viewer/settings
Use: Viewer settings panel (limited scope).

## 7) Docs and Chapters

### /docs/[slug]
Use: Open a specific chapter/document by slug.

How it works:

- combines static chapter content with managed documentation content
- role redirects decide which portal shell wraps the chapter experience

## 8) Prometheus Usage In Portal

The portal provides two monitoring styles:

- Approved query catalog (safe presets)
- Raw internal Prometheus proxy APIs (advanced analysis)

Available APIs:

- GET /api/prometheus/query?q=up
- GET /api/prometheus/status
- GET /api/prometheus/raw/query?query=up
- GET /api/prometheus/raw/query-range?query=up&start=<epoch>&end=<epoch>&step=30s
- GET /api/prometheus/raw/targets
- GET /api/prometheus/website?url=https://example.com

Authentication options for Prometheus backend integration:

- Bearer token via PROMETHEUS_BEARER_TOKEN
- Basic auth via PROMETHEUS_BASIC_AUTH_USERNAME and PROMETHEUS_BASIC_AUTH_PASSWORD

## 9) Typical User Workflows

### Admin workflow

1. Log in as admin
2. Review /admin/dashboard
3. Validate Prometheus health at /admin/prometheus
4. Maintain services at /admin/services
5. Manage users at /admin/users
6. Review traceability at /admin/audit and /admin/security

### Operator workflow

1. Open /operator/dashboard
2. Respond from /operator/alerts
3. Check context in /operator/services and /operator/docs

### Viewer workflow

1. Open /viewer/dashboard
2. Watch /viewer/alerts and /viewer/services
3. Use /viewer/docs and /viewer/reports for insight

## 10) Troubleshooting Quick Guide

If Prometheus shows fetch failed:

1. verify PROMETHEUS_BASE_URL is reachable from server runtime
2. verify auth values (bearer or basic auth)
3. verify PROMETHEUS_DEMO_MODE is set correctly for expected mode
4. run connectivity test script: npm run prometheus:test-link

If query parse error appears:

1. ensure query parameter is valid PromQL
2. do not pass website URLs in raw PromQL endpoints
3. use website endpoint for URL checks: /api/prometheus/website?url=<your_url>

## 11) Recommended Operational Practice

- Keep demo mode off in real environments.
- Use approved presets for dashboards; use raw endpoints for investigation.
- Keep audit/security review as daily routine for admin role.
- Keep documentation current so operators can resolve incidents quickly.
