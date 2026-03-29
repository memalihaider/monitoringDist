"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import {
  ArrowRight,
  Activity,
  ShieldCheck,
  BookOpen,
  Monitor,
  Gauge,
  BellRing,
  LineChart,
  Workflow,
  Database,
  Lock,
  CheckCircle2,
  Cloud,
  Server,
  Container,
  Sparkles,
} from "lucide-react";

export default function Home() {
  const { user, role } = useAuth();
  const portalHref = user
    ? role === "admin"
      ? "/admin/dashboard"
      : role === "operator"
        ? "/operator/dashboard"
        : "/viewer/dashboard"
    : "/login";
  const registerHref = user
    ? role === "admin"
      ? "/admin/dashboard"
      : role === "operator"
        ? "/operator/dashboard"
        : "/viewer/dashboard"
    : "/login?mode=register";

  const navItems = [
    { href: "#capabilities", label: "Capabilities" },
    { href: "#architecture", label: "Architecture" },
    { href: "#workflow", label: "Workflow" },
    { href: "#faq", label: "FAQ" },
  ];

  const capabilityCards = [
    {
      title: "Live Service Health",
      description:
        "Track uptime, saturation, and latency for every critical service from one unified operational surface.",
      icon: Gauge,
      tone: "bg-cyan-100 text-cyan-700",
    },
    {
      title: "Smart Alert Context",
      description:
        "View alert spikes with linked runbooks and chapter notes so incident response starts with context, not guesswork.",
      icon: BellRing,
      tone: "bg-amber-100 text-amber-700",
    },
    {
      title: "Role-Aware Access",
      description:
        "Keep operations secure with clear Admin, Operator, and Viewer boundaries enforced across data and actions.",
      icon: ShieldCheck,
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Trend Intelligence",
      description:
        "Analyze historical reliability patterns to identify fragile services before they become customer-facing outages.",
      icon: LineChart,
      tone: "bg-indigo-100 text-indigo-700",
    },
    {
      title: "Prometheus Native",
      description:
        "Keep your current instrumentation strategy and ingest PromQL-driven telemetry without rebuilding your stack.",
      icon: Activity,
      tone: "bg-rose-100 text-rose-700",
    },
    {
      title: "Operational Docs",
      description:
        "Bridge monitoring with system documentation and chapter references to reduce onboarding and handover friction.",
      icon: BookOpen,
      tone: "bg-slate-200 text-slate-700",
    },
  ];

  const workflowSteps = [
    {
      title: "Collect",
      detail: "Exporters and probes stream service and infrastructure metrics into Prometheus.",
      icon: Workflow,
    },
    {
      title: "Analyze",
      detail: "Dashboards and threshold checks reveal anomaly patterns across distributed systems.",
      icon: LineChart,
    },
    {
      title: "Act",
      detail: "Teams triage incidents with role-based permissions and audit-friendly operations.",
      icon: Lock,
    },
    {
      title: "Improve",
      detail: "Use post-incident notes and trend reviews to continuously harden reliability.",
      icon: Sparkles,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7fbfc] text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-136 w-136 -translate-x-1/2 rounded-full bg-cyan-200/55 blur-[90px]" />
        <div className="absolute right-0 top-1/3 h-120 w-120 rounded-full bg-amber-200/45 blur-[100px]" />
        <div className="absolute -left-24 bottom-0 h-104 w-104 rounded-full bg-emerald-200/45 blur-[80px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 shadow-[0_10px_30px_-15px_rgba(15,23,42,0.8)]">
              <Monitor className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide text-slate-900">MonitorDist</p>
              <p className="text-xs text-slate-500">Distributed Reliability Platform</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={portalHref}
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:inline-flex"
            >
              {user ? "Dashboard" : "Sign In"}
            </Link>
            <Link
              href={registerHref}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {user ? "Open Portal" : "Start Free"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-14 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-18 lg:pt-20">
          <div className="reveal-up reveal-delay-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-cyan-800">
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              Next.js + Firebase + Prometheus + Data Connect
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Complete Observability For
              <span className="block bg-linear-to-r from-cyan-700 via-slate-900 to-emerald-700 bg-clip-text text-transparent">
                Distributed Systems Teams
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Launch a reliability command center with unified monitoring, alert intelligence, secure role controls,
              and documentation-aware operations from one central platform.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={registerHref}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-15px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5 hover:bg-slate-700"
              >
                {user ? "Go To Dashboard" : "Create Workspace"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Explore Documentation
                <BookOpen className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Real-time metrics and health checks
              </div>
              <div className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Secure role-based access
              </div>
              <div className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Zero-friction team onboarding
              </div>
            </div>

            <p className="mt-6 text-sm font-medium text-slate-500">
              {user ? `Signed in as ${role ?? "viewer"}` : "Built for dev, staging, and production reliability workflows."}
            </p>
          </div>

          <div className="reveal-up reveal-delay-2">
            <div className="floating-card relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.55)] sm:p-6">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-cyan-500 via-emerald-500 to-amber-500" />
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">Live Reliability Snapshot</p>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Healthy
                </span>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request Throughput</span>
                    <span className="text-sm font-bold text-slate-900">14.8k/min</span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full w-[72%] rounded-full bg-cyan-500 shimmer-line" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">P95 Latency</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">186ms</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Open Alerts</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">04</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Top Incident Route</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">api-gateway → auth-service → cache-cluster</p>
                  <p className="mt-2 text-xs text-slate-500">Recovery guidance linked from chapter notes.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white/80">
          <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Services Monitored</p>
              <p className="mt-2 text-3xl font-black text-slate-900">32+</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Current Uptime</p>
              <p className="mt-2 text-3xl font-black text-slate-900">99.95%</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Median Detection</p>
              <p className="mt-2 text-3xl font-black text-slate-900">42s</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Role Protected Routes</p>
              <p className="mt-2 text-3xl font-black text-slate-900">100%</p>
            </div>
          </div>
        </section>

        <section id="capabilities" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="reveal-up reveal-delay-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Core Capabilities</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Everything You Need For Day-2 Operations
            </h2>
            <p className="mt-4 max-w-2xl text-slate-600">
              Move from fragmented tools to one operational layer that keeps metrics, incidents, and documentation in sync.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilityCards.map((card, index) => (
              <article
                key={card.title}
                className={`reveal-up reveal-delay-${(index % 3) + 1} rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-35px_rgba(15,23,42,0.8)] transition hover:-translate-y-1 hover:border-slate-300`}
              >
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${card.tone}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="architecture" className="border-y border-slate-200 bg-white py-16 lg:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="reveal-up reveal-delay-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">System Architecture</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Built For Modern Distributed Stacks
              </h2>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-[#f8fafb] p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Data Sources</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-white p-3"><Server className="h-4 w-4 text-cyan-700" /><span className="text-sm font-medium text-slate-700">Node Exporters</span></div>
                  <div className="flex items-center gap-3 rounded-xl bg-white p-3"><Container className="h-4 w-4 text-cyan-700" /><span className="text-sm font-medium text-slate-700">Container Metrics</span></div>
                  <div className="flex items-center gap-3 rounded-xl bg-white p-3"><Database className="h-4 w-4 text-cyan-700" /><span className="text-sm font-medium text-slate-700">Service Probes</span></div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#f8fafb] p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Processing Layer</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-white p-3"><Cloud className="h-4 w-4 text-emerald-700" /><span className="text-sm font-medium text-slate-700">Prometheus Query API</span></div>
                  <div className="flex items-center gap-3 rounded-xl bg-white p-3"><Lock className="h-4 w-4 text-emerald-700" /><span className="text-sm font-medium text-slate-700">Firebase Auth + Roles</span></div>
                  <div className="flex items-center gap-3 rounded-xl bg-white p-3"><Workflow className="h-4 w-4 text-emerald-700" /><span className="text-sm font-medium text-slate-700">Alert and Note Routing</span></div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#f8fafb] p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Experience Layer</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-white p-3"><Monitor className="h-4 w-4 text-amber-700" /><span className="text-sm font-medium text-slate-700">Operational Dashboard</span></div>
                  <div className="flex items-center gap-3 rounded-xl bg-white p-3"><BookOpen className="h-4 w-4 text-amber-700" /><span className="text-sm font-medium text-slate-700">Chapter Documentation</span></div>
                  <div className="flex items-center gap-3 rounded-xl bg-white p-3"><ShieldCheck className="h-4 w-4 text-amber-700" /><span className="text-sm font-medium text-slate-700">Admin Console</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="reveal-up reveal-delay-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Team Workflow</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Operational Rhythm In Four Steps</h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map((step, index) => (
              <article
                key={step.title}
                className={`reveal-up reveal-delay-${(index % 3) + 1} rounded-2xl border border-slate-200 bg-white p-5`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-400">0{index + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="border-y border-slate-200 bg-white py-16 lg:py-20">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="reveal-up reveal-delay-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Frequently Asked Questions</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Answers For Technical Teams
              </h2>
            </div>

            <div className="mt-10 space-y-3">
              <details className="group rounded-2xl border border-slate-200 bg-[#f9fbfb] p-5" open>
                <summary className="cursor-pointer list-none text-sm font-bold text-slate-900">Can we use existing Prometheus exporters?</summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Yes. The platform is Prometheus-native and designed to layer on top of existing exporters and scrape configurations.
                </p>
              </details>
              <details className="group rounded-2xl border border-slate-200 bg-[#f9fbfb] p-5">
                <summary className="cursor-pointer list-none text-sm font-bold text-slate-900">How is access control handled?</summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Firebase Authentication verifies identity while Firestore role policies enforce admin, operator, and viewer privileges.
                </p>
              </details>
              <details className="group rounded-2xl border border-slate-200 bg-[#f9fbfb] p-5">
                <summary className="cursor-pointer list-none text-sm font-bold text-slate-900">Is this suitable for thesis and production demos?</summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Yes. It combines technical depth for academic presentation with practical workflows for real operational environments.
                </p>
              </details>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="reveal-up reveal-delay-2 rounded-3xl border border-slate-200 bg-slate-900 p-8 text-white shadow-[0_30px_90px_-45px_rgba(15,23,42,1)] sm:p-10 lg:flex lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Ready To Launch</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Build Your Complete Monitoring Landing Experience</h2>
              <p className="mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
                Start with secure access, live telemetry, and incident-ready workflows without stitching multiple products together.
              </p>
            </div>
            <div className="mt-6 flex shrink-0 flex-wrap gap-3 lg:mt-0">
              <Link
                href={user ? "/dashboard" : "/login?mode=register"}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-cyan-200"
              >
                {user ? "Enter Dashboard" : "Get Started"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-500 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
              >
                View Documentation
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:px-6 sm:flex-row lg:px-8">
          <p>Monitoring Solution for Distributed Services © 2026</p>
          <p>Built with Next.js, Firebase, and Prometheus</p>
        </div>
      </footer>
    </div>
  );
}
