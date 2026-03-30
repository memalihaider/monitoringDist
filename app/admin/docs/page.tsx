"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { BookOpen, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

type ManagedDoc = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  published: boolean;
  updatedAt: string;
};

type DocsResponse = {
  docs?: ManagedDoc[];
  canDelete?: boolean;
  error?: string;
};

type DocForm = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  published: boolean;
};

const EMPTY_FORM: DocForm = {
  id: "",
  slug: "",
  title: "",
  summary: "",
  content: "",
  published: true,
};

export default function AdminDocsPage() {
  const [docs, setDocs] = useState<ManagedDoc[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [form, setForm] = useState<DocForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch("/api/admin/docs");
      const result = (await response.json()) as DocsResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load docs");
      }
      setDocs(result.docs ?? []);
      setCanDelete(result.canDelete === true);
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to load docs";
      setError(nextMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const filteredDocs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return docs;
    }

    return docs.filter(
      (doc) =>
        doc.title.toLowerCase().includes(term) ||
        doc.slug.toLowerCase().includes(term) ||
        doc.summary.toLowerCase().includes(term),
    );
  }, [docs, search]);

  function startEdit(doc: ManagedDoc) {
    setForm({
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      summary: doc.summary,
      content: doc.content,
      published: doc.published,
    });
    setError(null);
    setMessage(`Editing ${doc.title}`);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  async function saveDoc() {
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch("/api/admin/docs", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save doc");
      }

      setMessage(form.id ? "Doc updated" : "Doc created");
      resetForm();
      await loadDocs();
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to save doc";
      setError(nextMessage);
    } finally {
      setSaving(false);
    }
  }

  async function deleteDoc(id: string) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch(`/api/admin/docs?id=${id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to delete doc");
      }

      if (form.id === id) {
        resetForm();
      }
      setMessage("Doc deleted");
      await loadDocs();
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to delete doc";
      setError(nextMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <p className="admin-eyebrow">Knowledge base</p>
        <h3 className="admin-title text-2xl">Operations documentation</h3>
        <p className="mt-2 text-sm text-(--admin-muted)">
          Create, edit, publish, and maintain documentation from the admin control plane.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="admin-chip">Managed docs: {docs.length}</span>
          <span className="admin-chip">Published: {docs.filter((entry) => entry.published).length}</span>
        </div>
        {!canDelete ? (
          <p className="mt-2 text-xs font-semibold text-(--admin-muted)">Delete actions are restricted to super-admin users.</p>
        ) : null}
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="admin-panel p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search docs by title, slug, summary"
              className="w-80 rounded-full border border-(--admin-line) bg-white px-4 py-2 text-xs"
            />
            <button
              onClick={() => {
                void loadDocs();
              }}
              className="rounded-full border border-(--admin-line) bg-white px-3 py-1.5 text-xs font-semibold"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="grid place-items-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--admin-ink) border-t-transparent" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <p className="text-sm text-(--admin-muted)">No docs found.</p>
          ) : (
            <div className="space-y-3">
              {filteredDocs.map((doc) => (
                <article key={doc.id} className="rounded-2xl border border-(--admin-line) bg-white/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <p className="text-sm font-semibold text-(--admin-ink)">{doc.title}</p>
                      <span className="rounded-full border border-(--admin-line) px-2 py-0.5 text-[11px] font-semibold uppercase">
                        {doc.published ? "published" : "draft"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => startEdit(doc)}
                        className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-3 py-1 font-semibold"
                        disabled={saving}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      {canDelete ? (
                        <button
                          onClick={() => {
                            void deleteDoc(doc.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-3 py-1 font-semibold"
                          disabled={saving}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      ) : (
                        <span className="rounded-full border border-(--admin-line) px-3 py-1 text-[11px] font-semibold text-(--admin-muted)">
                          Super-admin delete only
                        </span>
                      )}
                      <Link
                        href={`/docs/${doc.slug}`}
                        className="inline-flex items-center gap-1 rounded-full border border-(--admin-line) bg-white px-3 py-1 font-semibold"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                      </Link>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-(--admin-muted)">Slug: {doc.slug}</p>
                  <p className="mt-1 text-sm text-(--admin-muted)">{doc.summary || "No summary"}</p>
                  <p className="mt-2 text-xs text-(--admin-muted)">
                    Updated: {doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : "-"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="admin-panel p-6">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h4 className="admin-title text-lg">{form.id ? "Edit doc" : "Create doc"}</h4>
          </div>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Title"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder="Slug (optional)"
              className="w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
            />
            <textarea
              value={form.summary}
              onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
              placeholder="Summary"
              className="min-h-18 w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
            />
            <textarea
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              placeholder="Content (Markdown supported)"
              className="min-h-48 w-full rounded-xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-xs font-semibold text-(--admin-muted)">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(event) => setForm((prev) => ({ ...prev, published: event.target.checked }))}
              />
              Published
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => {
                void saveDoc();
              }}
              className="rounded-full border border-(--admin-ink) bg-(--admin-ink) px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving..." : form.id ? "Update Doc" : "Create Doc"}
            </button>
            <button
              onClick={resetForm}
              className="rounded-full border border-(--admin-line) bg-white px-4 py-2 text-xs font-semibold"
              disabled={saving}
            >
              Clear
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
