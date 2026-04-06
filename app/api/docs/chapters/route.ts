import { NextRequest, NextResponse } from "next/server";
import { getChapterBySlug, chapters } from "@/lib/docs/chapters";
import { getAdminDb } from "@/lib/firebase/admin";

function toIsoString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).toISOString();
  }
  return new Date(0).toISOString();
}

function staticChapterToContent(slug: string) {
  const chapter = getChapterBySlug(slug);
  if (!chapter) {
    return null;
  }

  const sectionBody = chapter.sections
    .map((section) => {
      const paragraphs = section.paragraphs.join("\n\n");
      return `## ${section.heading}\n\n${paragraphs}`;
    })
    .join("\n\n");

  return {
    id: `static:${chapter.slug}`,
    slug: chapter.slug,
    title: chapter.title,
    summary: chapter.summary,
    content: sectionBody,
    published: true,
    source: "static" as const,
    updatedAt: new Date(0).toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug")?.trim();
    const snapshot = await getAdminDb()
      .collection("admin_docs")
      .orderBy("updatedAt", "desc")
      .limit(400)
      .get();

    const managedDocs = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as {
          slug?: string;
          title?: string;
          summary?: string;
          content?: string;
          published?: boolean;
          updatedAt?: unknown;
        };

        if (!data.slug || !data.title || !data.content) {
          return null;
        }

        return {
          id: docSnap.id,
          slug: data.slug,
          title: data.title,
          summary: data.summary ?? "",
          content: data.content,
          published: data.published !== false,
          source: "managed" as const,
          updatedAt: toIsoString(data.updatedAt),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const publishedDocs = managedDocs.filter((doc) => doc.published);

    if (slug) {
      const managed = publishedDocs.find((doc) => doc.slug === slug);
      if (managed) {
        return NextResponse.json({ chapter: managed });
      }

      const fallback = staticChapterToContent(slug);
      return NextResponse.json({ chapter: fallback });
    }

    if (publishedDocs.length > 0) {
      return NextResponse.json({ chapters: publishedDocs });
    }

    const fallbackList = chapters.map((chapter) => staticChapterToContent(chapter.slug)).filter((entry) => entry);
    return NextResponse.json({ chapters: fallbackList });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = 500;
    return NextResponse.json({ error: message }, { status });
  }
}
