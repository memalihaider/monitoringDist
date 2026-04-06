"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import ProtectedRoute from "@/components/auth/protected-route";
import ChapterNotes from "@/components/docs/chapter-notes";
import { subscribePublishedManagedDocs } from "@/lib/firestore/admin-docs";
import { getChapterBySlug } from "@/lib/docs/chapters";

type ChapterResponse = {
  chapter?: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    content: string;
    source: "managed" | "static";
  } | null;
  error?: string;
};

export default function DocsChapterPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapterContent, setChapterContent] = useState<ChapterResponse["chapter"]>(null);

  if (!slug) {
    notFound();
  }

  const staticFallback = useCallback(() => {
    const fallback = getChapterBySlug(slug);
    if (!fallback) {
      setChapterContent(null);
      return;
    }

    setChapterContent({
      id: `static:${fallback.slug}`,
      slug: fallback.slug,
      title: fallback.title,
      summary: fallback.summary,
      content: fallback.sections
        .map((section) => `## ${section.heading}\n\n${section.paragraphs.join("\n\n")}`)
        .join("\n\n"),
      source: "static",
    });
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribePublishedManagedDocs(
      (managedDocs) => {
        const managed = managedDocs.find((doc) => doc.slug === slug);
        if (managed) {
          setChapterContent({
            id: managed.id,
            slug: managed.slug,
            title: managed.title,
            summary: managed.summary,
            content: managed.content,
            source: "managed",
          });
        } else {
          staticFallback();
        }
        setLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        staticFallback();
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [slug, staticFallback]);

  const renderedBlocks = useMemo(() => {
    const content = chapterContent?.content ?? "";
    return content
      .split(/\n\n+/)
      .map((block) => block.trim())
      .filter(Boolean);
  }, [chapterContent?.content]);

  if (!loading && !chapterContent) {
    notFound();
  }

  return (
    <ProtectedRoute minimumRole="viewer">
      <div className="content-card">
        <p>
          <Link href="/docs" className="text-link">
            Back to documentation index
          </Link>
        </p>
        <h2>{chapterContent?.title ?? "Loading..."}</h2>
        <p>{chapterContent?.summary ?? ""}</p>
        {error ? <p className="error-text">{error}</p> : null}
        <p className="text-sm text-(--admin-muted)">
          Source: {chapterContent?.source === "managed" ? "Managed Docs" : "Static Chapter"}
        </p>
        <p className="text-xs font-semibold text-(--admin-muted)">Live updates enabled.</p>

        <div className="chapter-sections">
          {loading ? (
            <p>Loading chapter...</p>
          ) : (
            renderedBlocks.map((block, idx) => {
              if (block.startsWith("## ")) {
                return (
                  <article key={`${idx}-${block.slice(0, 24)}`} className="chapter-section-item">
                    <h3>{block.replace(/^##\s+/, "")}</h3>
                  </article>
                );
              }
              return <p key={`${idx}-${block.slice(0, 24)}`}>{block}</p>;
            })
          )}
        </div>
      </div>

      <ChapterNotes chapterSlug={slug} />
    </ProtectedRoute>
  );
}
