"use client";

import { useEffect, useMemo, useState } from "react";
import UserRoleManager from "@/components/admin/user-role-manager";
import { authenticatedFetch } from "@/lib/auth/client-auth-fetch";
import { APP_ROLES, type AppRole } from "@/lib/auth/roles";
import { UserPlus, Users, UserCheck } from "lucide-react";

type AdminUser = {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: string;
  lastSignInAt: string;
  role: AppRole | "unassigned";
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("Monitor#User123");
  const [role, setRole] = useState<AppRole>("viewer");
  const [creating, setCreating] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch("/api/admin/users");
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Failed to load users");
      }

      const result = (await response.json()) as { users?: AdminUser[] };
      setUsers(result.users ?? []);
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to load users";
      setError(nextMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function createUser() {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setCreating(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authenticatedFetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          displayName: displayName.trim(),
          password: password.trim(),
          role,
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Failed to create user");
      }

      setMessage(`Created user ${email.trim()} as ${role}`);
      setEmail("");
      setDisplayName("");
      setPassword("Monitor#User123");
      setRole("viewer");
      await loadUsers();
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : "Failed to create user";
      setError(nextMessage);
    } finally {
      setCreating(false);
    }
  }

  const userSummary = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((user) => user.role === "admin").length,
      operators: users.filter((user) => user.role === "operator").length,
      viewers: users.filter((user) => user.role === "viewer").length,
      unassigned: users.filter((user) => user.role === "unassigned").length,
    };
  }, [users]);

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(20,21,21,0.08)]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="admin-eyebrow">Identity control</p>
            <h3 className="admin-title text-2xl">User directory</h3>
            <p className="mt-1 text-sm text-(--admin-muted)">
              Provision accounts, manage roles, and verify access posture across the portal.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Total", value: userSummary.total },
            { label: "Admins", value: userSummary.admins },
            { label: "Operators", value: userSummary.operators },
            { label: "Viewers", value: userSummary.viewers },
            { label: "Unassigned", value: userSummary.unassigned },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-(--admin-line) bg-white/80 p-3">
              <p className="text-xs uppercase tracking-widest text-(--admin-muted)">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-(--admin-ink)">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-panel p-6">
        <div className="flex items-center gap-3">
          <UserPlus className="h-5 w-5" />
          <h4 className="admin-title text-lg">Create new user</h4>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="email"
            className="rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            type="text"
            className="rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
            placeholder="Display name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <input
            type="text"
            className="rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <select
            className="rounded-2xl border border-(--admin-line) bg-white px-3 py-2 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value as AppRole)}
          >
            {APP_ROLES.map((entryRole) => (
              <option key={entryRole} value={entryRole}>
                {entryRole}
              </option>
            ))}
          </select>
          <button
            className="rounded-full border border-(--admin-ink) bg-(--admin-ink) px-4 py-2 text-xs font-semibold text-white"
            disabled={creating}
            onClick={() => {
              void createUser();
            }}
          >
            {creating ? "Creating..." : "Create User"}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </section>

      <section className="admin-panel p-6">
        <div className="flex items-center gap-3">
          <UserCheck className="h-5 w-5" />
          <h4 className="admin-title text-lg">Authenticated users</h4>
        </div>

        {loading ? (
          <div className="mt-4 grid place-items-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--admin-ink) border-t-transparent" />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-(--admin-line) text-left text-xs uppercase tracking-widest text-(--admin-muted)">
                  <th className="px-2 py-2 font-semibold">Email</th>
                  <th className="px-2 py-2 font-semibold">Name</th>
                  <th className="px-2 py-2 font-semibold">Role</th>
                  <th className="px-2 py-2 font-semibold">Verified</th>
                  <th className="px-2 py-2 font-semibold">Disabled</th>
                  <th className="px-2 py-2 font-semibold">Last Sign-In</th>
                </tr>
              </thead>
              <tbody>
                {users.map((entry) => (
                  <tr key={entry.uid} className="border-b border-(--admin-line)/60">
                    <td className="px-2 py-3">{entry.email || "-"}</td>
                    <td className="px-2 py-3">{entry.displayName || "-"}</td>
                    <td className="px-2 py-3 font-semibold uppercase">{entry.role}</td>
                    <td className="px-2 py-3">{entry.emailVerified ? "Yes" : "No"}</td>
                    <td className="px-2 py-3">{entry.disabled ? "Yes" : "No"}</td>
                    <td className="px-2 py-3 text-xs">{entry.lastSignInAt || "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <UserRoleManager />
    </div>
  );
}
