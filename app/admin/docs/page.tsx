"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, FileText, Terminal } from "lucide-react";
import { chapters } from "@/lib/docs/chapters";

export default function AdminDocsPage() {
  const categories = [
    {
      title: "Getting Started",
      description: "Quick start guides and baseline concepts.",
      icon: <BookOpen className="h-5 w-5" />,
      slugs: chapters.slice(0, 2).map((chapter) => chapter.slug),
    },
    {
      title: "API Reference",
      description: "Endpoints, payloads, and integration patterns.",
      icon: <FileText className="h-5 w-5" />,
      slugs: chapters.slice(1, 3).map((chapter) => chapter.slug),
    },
    {
      title: "CLI Tools",
      description: "Command line utilities and automation helpers.",
      icon: <Terminal className="h-5 w-5" />,
      slugs: chapters.slice(2, 4).map((chapter) => chapter.slug),
    },
  ];

  function titleFromSlug(slug: string) {
    return chapters.find((chapter) => chapter.slug === slug)?.title ?? slug;
  }

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <p className="admin-eyebrow">Knowledge base</p>
        <h3 className="admin-title text-2xl">Operations documentation</h3>
        <p className="mt-2 text-sm text-(--admin-muted)">
          Procedures, workflows, and platform references for the admin team.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {categories.map((cat) => (
          <div key={cat.title} className="admin-panel p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
                {cat.icon}
              </div>
              <div>
                <h4 className="admin-title text-lg">{cat.title}</h4>
                <p className="text-xs text-(--admin-muted)">{cat.description}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {cat.slugs.map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/docs/${slug}`}
                    className="flex items-center justify-between rounded-xl border border-(--admin-line) bg-white/80 px-3 py-2 text-xs font-semibold text-(--admin-ink)"
                  >
                    {titleFromSlug(slug)}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
