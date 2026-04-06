"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { subscribePublishedManagedDocs } from "@/lib/firestore/admin-docs";
import { chapters as staticChapters } from "@/lib/docs/chapters";
import { BookOpen, ChevronRight } from "lucide-react";

type ChapterItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  source: "managed" | "static";
};

type ChaptersResponse = {
  chapters?: ChapterItem[];
  error?: string;
};

export default function OperatorDocsPage() {
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fallback = staticChapters.map((chapter) => ({
      id: `static:${chapter.slug}`,
      slug: chapter.slug,
      title: chapter.title,
      summary: chapter.summary,
      source: "static" as const,
    }));

    const unsubscribe = subscribePublishedManagedDocs(
      (managedDocs) => {
        setError(null);
        setLoading(false);

        if (managedDocs.length === 0) {
          setChapters(fallback);
          return;
        }

        setChapters(
          managedDocs.map((doc) => ({
            id: doc.id,
            slug: doc.slug,
            title: doc.title,
            summary: doc.summary,
            source: "managed" as const,
          })),
        );
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
        setChapters(fallback);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <p className="admin-eyebrow">Knowledge base</p>
        <h3 className="admin-title text-2xl">Operator runbooks</h3>
        <p className="mt-2 text-sm text-(--admin-muted)">
          Procedures, workflows, and platform references for operational response.
        </p>
        <p className="mt-2 text-xs font-semibold text-(--admin-muted)">Live updates enabled.</p>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </section>

      <section className="admin-panel p-6">
        {loading ? (
          <div className="grid place-items-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--admin-ink) border-t-transparent" />
          </div>
        ) : chapters.length === 0 ? (
          <p className="text-sm text-(--admin-muted)">No docs available.</p>
        ) : (
          <div className="grid gap-3">
            {chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/docs/${chapter.slug}`}
                className="flex items-center justify-between rounded-2xl border border-(--admin-line) bg-white/80 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-(--admin-ink)">{chapter.title}</p>
                    <p className="text-xs text-(--admin-muted)">{chapter.summary}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-(--admin-line) px-2 py-1 text-[11px] font-semibold uppercase">
                    {chapter.source}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
