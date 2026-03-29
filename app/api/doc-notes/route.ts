import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/server-auth";
import { getAdminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    const body = (await request.json()) as {
      chapterSlug?: string;
      title?: string;
      content?: string;
    };

    const chapterSlug = body.chapterSlug?.trim();
    const title = body.title?.trim();
    const content = body.content?.trim();

    if (!chapterSlug || !title || !content) {
      return NextResponse.json(
        { error: "chapterSlug, title, and content are required" },
        { status: 400 },
      );
    }

    const noteRef = getAdminDb().collection("doc_notes").doc();
    await noteRef.set({
      chapterSlug,
      title,
      content,
      authorUid: authUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ id: noteRef.id, status: "created" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await authorizeRequest(request, ["admin"]);
    const noteId = request.nextUrl.searchParams.get("id")?.trim();

    if (!noteId) {
      return NextResponse.json({ error: "Note id is required" }, { status: 400 });
    }

    await getAdminDb().collection("doc_notes").doc(noteId).delete();
    return NextResponse.json({ status: "deleted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
