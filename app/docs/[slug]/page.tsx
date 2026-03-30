"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import ProtectedRoute from "@/components/auth/protected-route";
import ChapterNotes from "@/components/docs/chapter-notes";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
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

  useEffect(() => {
    let active = true;

    async function loadChapter() {
      setLoading(true);
      setError(null);

      try {
        const response = await authenticatedFetch(`/api/docs/chapters?slug=${encodeURIComponent(slug)}`);
        const result = (await response.json()) as ChapterResponse;

        if (!response.ok) {
          throw new Error(result.error ?? "Failed to load chapter");
        }

        if (active) {
          if (result.chapter) {
            setChapterContent(result.chapter);
          } else {
            const fallback = getChapterBySlug(slug);
            if (!fallback) {
              setChapterContent(null);
            } else {
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
            }
          }
        }
      } catch (nextError) {
        const nextMessage = nextError instanceof Error ? nextError.message : "Failed to load chapter";
        if (active) {
          setError(nextMessage);
          const fallback = getChapterBySlug(slug);
          if (fallback) {
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
          } else {
            setChapterContent(null);
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadChapter();

    return () => {
      active = false;
    };
  }, [slug]);

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
