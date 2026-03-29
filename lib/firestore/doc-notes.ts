import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export type DocNote = {
  id: string;
  chapterSlug: string;
  title: string;
  content: string;
  authorUid: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

function toDate(value: unknown): Date | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate() as Date;
  }
  return null;
}

function parseNote(docSnap: QueryDocumentSnapshot): DocNote | null {
  const data = docSnap.data() as {
    chapterSlug?: string;
    title?: string;
    content?: string;
    authorUid?: string;
    createdAt?: unknown;
    updatedAt?: unknown;
  };

  if (!data.chapterSlug || !data.title || !data.content || !data.authorUid) {
    return null;
  }

  return {
    id: docSnap.id,
    chapterSlug: data.chapterSlug,
    title: data.title,
    content: data.content,
    authorUid: data.authorUid,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function subscribeChapterNotes(
  chapterSlug: string,
  onData: (notes: DocNote[]) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  const notesQuery = query(
    collection(db, "doc_notes"),
    where("chapterSlug", "==", chapterSlug),
    orderBy("updatedAt", "desc"),
  );

  return onSnapshot(
    notesQuery,
    (snapshot) => {
      const notes = snapshot.docs
        .map((docSnap) => parseNote(docSnap))
        .filter((note): note is DocNote => note !== null);
      onData(notes);
    },
    onError,
  );
}

export async function createChapterNote(input: {
  chapterSlug: string;
  title: string;
  content: string;
  authorUid: string;
}) {
  await addDoc(collection(db, "doc_notes"), {
    chapterSlug: input.chapterSlug,
    title: input.title,
    content: input.content,
    authorUid: input.authorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function removeChapterNote(noteId: string) {
  await deleteDoc(doc(db, "doc_notes", noteId));
}
