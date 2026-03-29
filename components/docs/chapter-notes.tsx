"use client";

import { useEffect, useState } from "react";
import { subscribeChapterNotes, type DocNote } from "@/lib/firestore/doc-notes";
import { useAuth } from "@/lib/auth/auth-context";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }
  return value.toLocaleString();
}

export default function ChapterNotes({ chapterSlug }: { chapterSlug: string }) {
  const { user, role } = useAuth();
  const [notes, setNotes] = useState<DocNote[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = role === "admin";

  useEffect(() => {
    const unsubscribe = subscribeChapterNotes(
      chapterSlug,
      (nextNotes) => {
        setNotes(nextNotes);
        setError(null);
      },
      (nextError) => {
        setError(nextError.message);
      },
    );

    return unsubscribe;
  }, [chapterSlug]);

  async function addNote() {
    if (!canManage || !user) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setError("Title and note content are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await authenticatedFetch("/api/doc-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chapterSlug,
          title: trimmedTitle,
          content: trimmedContent,
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Failed to create note");
      }

      setTitle("");
      setContent("");
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to create note";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    if (!canManage) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await authenticatedFetch(`/api/doc-notes?id=${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Failed to delete note");
      }
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to delete note";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="content-card" style={{ marginTop: "1rem" }}>
      <h3>Dynamic Notes</h3>
      <p>These notes are stored in Firestore for chapter-specific updates.</p>

      {canManage ? (
        <div className="note-form">
          <input
            type="text"
            placeholder="Note title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            placeholder="Write your chapter note"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={4}
          />
          <button className="button-primary" onClick={() => void addNote()} disabled={saving}>
            {saving ? "Saving..." : "Add note"}
          </button>
        </div>
      ) : (
        <p>Only Admin can add or remove dynamic notes.</p>
      )}

      {error ? <p className="error-text">{error}</p> : null}

      <ul className="list">
        {notes.length === 0 ? (
          <li>No notes yet for this chapter.</li>
        ) : (
          notes.map((note) => (
            <li key={note.id} className="note-item">
              <strong>{note.title}</strong>
              <p>{note.content}</p>
              <small>
                Author: {note.authorUid} | Updated: {formatDate(note.updatedAt ?? note.createdAt)}
              </small>
              {canManage ? (
                <button className="button-secondary" onClick={() => void deleteNote(note.id)}>
                  Delete
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
