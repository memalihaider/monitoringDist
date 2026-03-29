import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { AppRole } from "@/lib/auth/roles";

export type UserRoleRecord = {
  uid: string;
  role: AppRole;
  createdAt: Date | null;
  updatedAt: Date | null;
  updatedBy?: string;
};

function toDate(value: unknown): Date | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate() as Date;
  }
  return null;
}

function parseRoleDoc(docSnap: QueryDocumentSnapshot): UserRoleRecord | null {
  const data = docSnap.data() as {
    role?: AppRole;
    createdAt?: unknown;
    updatedAt?: unknown;
    updatedBy?: string;
  };

  if (data.role !== "admin" && data.role !== "operator" && data.role !== "viewer") {
    return null;
  }

  return {
    uid: docSnap.id,
    role: data.role,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    updatedBy: data.updatedBy,
  };
}

export function subscribeUserRoles(
  onData: (records: UserRoleRecord[]) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  const userRolesQuery = query(collection(db, "user_roles"), orderBy("updatedAt", "desc"));

  return onSnapshot(
    userRolesQuery,
    (snapshot) => {
      const records = snapshot.docs
        .map((docSnap) => parseRoleDoc(docSnap))
        .filter((record): record is UserRoleRecord => record !== null);
      onData(records);
    },
    onError,
  );
}

export async function updateUserRole(uid: string, role: AppRole, actorUid?: string) {
  await setDoc(
    doc(db, "user_roles", uid),
    {
      role,
      updatedBy: actorUid ?? "unknown",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}
