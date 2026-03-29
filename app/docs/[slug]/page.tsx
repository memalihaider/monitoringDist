"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import ProtectedRoute from "@/components/auth/protected-route";
import ChapterNotes from "@/components/docs/chapter-notes";
import { getChapterBySlug } from "@/lib/docs/chapters";

export default function DocsChapterPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  if (!slug) {
    notFound();
  }

  const chapter = getChapterBySlug(slug);

  if (!chapter) {
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
        <h2>{chapter.title}</h2>
        <p>{chapter.summary}</p>

        <div className="chapter-sections">
          {chapter.sections.map((section) => (
            <article key={section.heading} className="chapter-section-item">
              <h3>{section.heading}</h3>
              {section.paragraphs.map((paragraph, idx) => (
                <p key={`${section.heading}-${idx}`}>{paragraph}</p>
              ))}
            </article>
          ))}
        </div>
      </div>

      <ChapterNotes chapterSlug={chapter.slug} />
    </ProtectedRoute>
  );
}
