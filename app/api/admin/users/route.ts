import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/server-auth";
import { createAdminAuditEvent } from "@/lib/admin/audit-log";
import { APP_ROLES, type AppRole } from "@/lib/auth/roles";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export async function GET(request: NextRequest) {
  try {
    await authorizeRequest(request, ["admin"]);

    const [authUsersResult, roleSnapshot] = await Promise.all([
      getAdminAuth().listUsers(1000),
      getAdminDb().collection("user_roles").get(),
    ]);

    const rolesByUid = new Map<string, AppRole>();
    for (const docSnap of roleSnapshot.docs) {
      const role = docSnap.data().role;
      if (isAppRole(role)) {
        rolesByUid.set(docSnap.id, role);
      }
    }

    const users = authUsersResult.users.map((user) => ({
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      createdAt: user.metadata.creationTime ?? "",
      lastSignInAt: user.metadata.lastSignInTime ?? "",
      role: rolesByUid.get(user.uid) ?? "unassigned",
    }));

    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authorizeRequest(request, ["admin"]);
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
      role?: AppRole;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const displayName = body.displayName?.trim() || "";
    const role = isAppRole(body.role) ? body.role : "viewer";

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "email and password (min 6 chars) are required" },
        { status: 400 },
      );
    }

    const created = await getAdminAuth().createUser({
      email,
      password,
      displayName,
      emailVerified: true,
      disabled: false,
    });

    await Promise.all([
      getAdminAuth().setCustomUserClaims(created.uid, { role }),
      getAdminDb().collection("user_roles").doc(created.uid).set(
        {
          role,
          email,
          updatedBy: authUser.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      ),
      createAdminAuditEvent({
        actorUid: authUser.uid,
        actorRole: authUser.role,
        action: "create_user",
        target: created.uid,
        detail: `Created user ${email} with role ${role}`,
        severity: "info",
      }),
    ]);

    return NextResponse.json({
      status: "created",
      user: {
        uid: created.uid,
        email,
        displayName,
        role,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message.includes("email-already-exists")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const status = message === "Insufficient permissions" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
