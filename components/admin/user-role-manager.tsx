"use client";

import { useEffect, useMemo, useState } from "react";
import { APP_ROLES, type AppRole } from "@/lib/auth/roles";
import { subscribeUserRoles, updateUserRole, type UserRoleRecord } from "@/lib/firestore/user-roles";
import { useAuth } from "@/lib/auth/auth-context";
import { UserCog } from "lucide-react";

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }
  return value.toLocaleString();
}

export default function UserRoleManager() {
  const { user } = useAuth();
  const [records, setRecords] = useState<UserRoleRecord[]>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, AppRole>>({});
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [newUid, setNewUid] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeUserRoles(
      (nextRecords) => {
        setRecords(nextRecords);
        setError(null);
      },
      (nextError) => {
        setError(nextError.message);
      },
    );

    return unsubscribe;
  }, []);

  const mergedDrafts = useMemo(() => {
    const next = { ...draftRoles };
    for (const record of records) {
      if (!next[record.uid]) {
        next[record.uid] = record.role;
      }
    }
    return next;
  }, [draftRoles, records]);

  async function saveRole(uid: string) {
    const selectedRole = mergedDrafts[uid];
    if (!selectedRole) {
      return;
    }

    setSavingUid(uid);
    setMessage(null);
    setError(null);

    try {
      await updateUserRole(uid, selectedRole, user?.uid);
      setMessage(`Updated role for ${uid} to ${selectedRole}`);
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to update role";
      setError(nextMessage);
    } finally {
      setSavingUid(null);
    }
  }

  async function upsertByUid() {
    const uid = newUid.trim();
    if (!uid) {
      setError("Enter a valid UID");
      return;
    }

    setSavingUid(uid);
    setMessage(null);
    setError(null);

    try {
      await updateUserRole(uid, newRole, user?.uid);
      setMessage(`Saved role ${newRole} for UID ${uid}`);
      setNewUid("");
      setNewRole("viewer");
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to save role";
      setError(nextMessage);
    } finally {
      setSavingUid(null);
    }
  }

  return (
    <section className="admin-panel p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
          <UserCog className="h-5 w-5" />
        </div>
        <div>
          <h4 className="admin-title text-lg">Role management</h4>
          <p className="text-sm text-(--admin-muted)">
            Assign roles by existing records or directly by Firebase UID.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto]">
        <input
          type="text"
          placeholder="Firebase UID"
          className="rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
          value={newUid}
          onChange={(event) => setNewUid(event.target.value)}
        />
        <select
          className="rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
          value={newRole}
          onChange={(event) => setNewRole(event.target.value as AppRole)}
        >
          {APP_ROLES.map((role) => (
            <option value={role} key={role}>
              {role}
            </option>
          ))}
        </select>
        <button
          className="rounded-full border border-(--admin-ink) bg-(--admin-ink) px-4 py-2 text-xs font-semibold text-white"
          onClick={() => {
            void upsertByUid();
          }}
          disabled={Boolean(savingUid)}
        >
          Save UID Role
        </button>
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-(--admin-line) text-left text-xs uppercase tracking-widest text-(--admin-muted)">
              <th className="px-2 py-2 font-semibold">UID</th>
              <th className="px-2 py-2 font-semibold">Current Role</th>
              <th className="px-2 py-2 font-semibold">Change To</th>
              <th className="px-2 py-2 font-semibold">Updated At</th>
              <th className="px-2 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-sm text-(--admin-muted)">
                  No user role documents found yet.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.uid} className="border-b border-(--admin-line)/60">
                  <td className="px-2 py-3 text-xs">{record.uid}</td>
                  <td className="px-2 py-3 font-semibold uppercase">{record.role}</td>
                  <td className="px-2 py-3">
                    <select
                      className="rounded-xl border border-(--admin-line) bg-white px-2 py-1 text-xs"
                      value={mergedDrafts[record.uid] ?? record.role}
                      onChange={(event) =>
                        setDraftRoles((prev) => ({
                          ...prev,
                          [record.uid]: event.target.value as AppRole,
                        }))
                      }
                    >
                      {APP_ROLES.map((role) => (
                        <option value={role} key={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-3 text-xs">{formatDate(record.updatedAt ?? record.createdAt)}</td>
                  <td className="px-2 py-3">
                    <button
                      className="rounded-full border border-(--admin-line) px-3 py-1 text-xs font-semibold"
                      onClick={() => {
                        void saveRole(record.uid);
                      }}
                      disabled={savingUid === record.uid}
                    >
                      {savingUid === record.uid ? "Saving..." : "Save"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
