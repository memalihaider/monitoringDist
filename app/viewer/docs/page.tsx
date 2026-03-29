"use client";

import Link from "next/link";
import { BookOpen, FileText, ScrollText } from "lucide-react";

const VIEWER_DOCS = [
  {
    title: "Incident Response Overview",
    description: "Steps to follow during an outage and who to notify.",
    href: "/docs/incident-response",
    icon: ScrollText,
  },
  {
    title: "Service Catalog",
    description: "Ownership, SLAs, and escalation paths per service.",
    href: "/docs/service-catalog",
    icon: BookOpen,
  },
  {
    title: "Status Communication",
    description: "How to craft stakeholder updates during incidents.",
    href: "/docs/status-comms",
    icon: FileText,
  },
];

export default function ViewerDocsPage() {
  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <p className="admin-eyebrow">Documentation</p>
        <h3 className="admin-title text-2xl">Read-only playbooks</h3>
        <p className="mt-2 text-sm text-(--admin-muted)">
          Reference guides curated for viewer access.
        </p>
      </section>

      <section className="admin-panel p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {VIEWER_DOCS.map((doc) => (
            <Link
              key={doc.title}
              href={doc.href}
              className="group rounded-2xl border border-(--admin-line) bg-white/80 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(21,22,23,0.08)]"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
                  <doc.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-(--admin-ink)">{doc.title}</p>
              </div>
              <p className="mt-3 text-xs text-(--admin-muted)">{doc.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-(--admin-accent)">
                Open doc
                <span className="text-base">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
