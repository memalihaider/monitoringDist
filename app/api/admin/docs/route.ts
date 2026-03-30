import { NextRequest, NextResponse } from "next/server";
import { createAdminAuditEvent } from "@/lib/admin/audit-log";
import { authorizeRequest, requireSuperAdmin } from "@/lib/auth/server-auth";
import { getAdminDb } from "@/lib/firebase/admin";

type ManagedDocInput = {
  id?: string;
  slug?: string;
  title?: string;
  summary?: string;
  content?: string;
  published?: boolean;
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function toIsoString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).toISOString();
  }
  return new Date(0).toISOString();
}

function normalizeDocPayload(input: ManagedDocInput) {
  const slug = normalizeSlug(input.slug ?? input.title ?? "");
  const title = input.title?.trim() ?? "";
  const content = input.content?.trim() ?? "";

  if (!slug || !title || !content) {
    return null;
  }

  return {
    slug,
    title,
    summary: input.summary?.trim() ?? "",
    content,
    published: input.published !== false,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);

    const snapshot = await getAdminDb()
      .collection("admin_docs")
      .orderBy("updatedAt", "desc")
      .limit(300)
      .get();

    const docs = snapshot.docs
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
          updatedAt: toIsoString(data.updatedAt),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return NextResponse.json({ docs, canDelete: authUser.isSuperAdmin });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status =
      message === "Insufficient permissions" || message === "Super-admin permissions required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    const body = (await request.json()) as ManagedDocInput;
    const payload = normalizeDocPayload(body);

    if (!payload) {
      return NextResponse.json({ error: "slug/title/content are required" }, { status: 400 });
    }

    const existing = await getAdminDb()
      .collection("admin_docs")
      .where("slug", "==", payload.slug)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ error: "slug already exists" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const docRef = getAdminDb().collection("admin_docs").doc();
    await docRef.set({
      ...payload,
      createdAt: now,
      updatedAt: now,
      updatedBy: authUser.uid,
    });

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "create_doc",
      target: docRef.id,
      detail: `Created doc ${payload.slug}`,
      severity: "info",
    });

    return NextResponse.json({ status: "created", id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status =
      message === "Insufficient permissions" || message === "Super-admin permissions required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    const body = (await request.json()) as ManagedDocInput;
    const id = body.id?.trim();
    const payload = normalizeDocPayload(body);

    if (!id || !payload) {
      return NextResponse.json({ error: "id and payload are required" }, { status: 400 });
    }

    const duplicate = await getAdminDb()
      .collection("admin_docs")
      .where("slug", "==", payload.slug)
      .limit(5)
      .get();

    if (duplicate.docs.some((docSnap) => docSnap.id !== id)) {
      return NextResponse.json({ error: "slug already exists" }, { status: 409 });
    }

    await getAdminDb().collection("admin_docs").doc(id).set(
      {
        ...payload,
        updatedAt: new Date().toISOString(),
        updatedBy: authUser.uid,
      },
      { merge: true },
    );

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "update_doc",
      target: id,
      detail: `Updated doc ${payload.slug}`,
      severity: "warning",
    });

    return NextResponse.json({ status: "updated", id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status =
      message === "Insufficient permissions" || message === "Super-admin permissions required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    requireSuperAdmin(authUser);
    const id = request.nextUrl.searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await getAdminDb().collection("admin_docs").doc(id).delete();

    await createAdminAuditEvent({
      actorUid: authUser.uid,
      actorRole: authUser.role,
      action: "delete_doc",
      target: id,
      detail: "Deleted managed doc",
      severity: "critical",
    });

    return NextResponse.json({ status: "deleted", id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status =
      message === "Insufficient permissions" || message === "Super-admin permissions required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
