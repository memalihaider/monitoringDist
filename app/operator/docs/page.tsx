"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
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
    let active = true;

    async function loadChapters() {
      setLoading(true);
      setError(null);

      try {
        const response = await authenticatedFetch("/api/docs/chapters");
        const result = (await response.json()) as ChaptersResponse;

        if (!response.ok) {
          throw new Error(result.error ?? "Failed to load docs");
        }

        if (active) {
          setChapters(result.chapters ?? []);
        }
      } catch (nextError) {
        const nextMessage = nextError instanceof Error ? nextError.message : "Failed to load docs";
        if (active) {
          setError(nextMessage);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadChapters();

    return () => {
      active = false;
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
