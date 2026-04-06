import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export type ManagedDocRealtime = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  published: boolean;
  updatedAt: string;
};

function toIsoString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).toISOString();
  }
  return new Date(0).toISOString();
}

function parseDoc(docSnap: QueryDocumentSnapshot): ManagedDocRealtime | null {
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
}

export function subscribePublishedManagedDocs(
  onData: (docs: ManagedDocRealtime[]) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  const docsQuery = query(collection(db, "admin_docs"), orderBy("updatedAt", "desc"), limit(400));

  return onSnapshot(
    docsQuery,
    (snapshot) => {
      const docs = snapshot.docs
        .map((docSnap) => parseDoc(docSnap))
        .filter((entry): entry is ManagedDocRealtime => entry !== null)
        .filter((entry) => entry.published)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

      onData(docs);
    },
    onError,
  );
}
