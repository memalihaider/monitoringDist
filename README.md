This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Admin hardening

- Set `FIREBASE_SUPER_ADMIN_UIDS` in `.env.local` as a comma-separated list of Firebase Auth UIDs.
- Delete actions for managed docs, reports, and manual services are restricted to super-admin users.
- The admin reports page now supports shaped CSV export and generated PDF export.

## Prometheus demo setup (for customer demos)

If you want to run dashboards without a live Prometheus server:

1. Add this to `.env.local`:

```bash
PROMETHEUS_DEMO_MODE=true
```

2. Seed demo users (if not already created):

```bash
npm run seed:test-users
```

3. Seed monitoring demo data:

```bash
npm run seed:demo-monitoring
```

This seeds:
- Demo service catalog entries
- Demo custom Prometheus query presets
- Demo reports
- Demo alert acknowledgements

## Real Prometheus setup

Official Prometheus links:

- Website: https://prometheus.io
- Download: https://prometheus.io/download/
- Documentation: https://prometheus.io/docs/
- GitHub: https://github.com/prometheus/prometheus

For real Prometheus testing in this app, update `.env.local`:

```bash
PROMETHEUS_DEMO_MODE=false
PROMETHEUS_BASE_URL=http://localhost:9090
# Optional if your Prometheus endpoint requires auth:
PROMETHEUS_BEARER_TOKEN=
# Optional alternative to bearer token:
PROMETHEUS_BASIC_AUTH_USERNAME=
PROMETHEUS_BASIC_AUTH_PASSWORD=
```

Prometheus basic-auth guide reference:

- https://prometheus.io/docs/guides/basic-auth/

Then run the direct connectivity test:

```bash
npm run prometheus:test-link
```

The test calls:
- `/api/v1/query?query=up`
- `/api/v1/query?query=min by (job) (up)`
- `/api/v1/query?query=ALERTS`

When this test passes, your dashboards and APIs in this project are ready to use real Prometheus data.

## Internal Prometheus proxy APIs

This project now includes protected internal APIs that proxy Prometheus endpoints:

- `GET /api/prometheus/raw/query?query=up`
- `GET /api/prometheus/raw/query-range?query=up&start=1710000000&end=1710003600&step=30s`
- `GET /api/prometheus/raw/targets`

All routes require an authenticated app user with role `admin`, `operator`, or `viewer`.

Typical production building blocks:

- Prometheus Server: Scrapes services and stores time-series data.
- Exporters: Node Exporter and custom exporters for distribution-specific metrics.
- HTTP API: Backend uses Prometheus query API and serves data to role-based dashboards.

## Firestore indexes

This project includes composite indexes for admin collections in `firestore.indexes.json`.

Deploy indexes with:

```bash
firebase deploy --only firestore:indexes
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
