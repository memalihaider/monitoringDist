import type { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { AppRole } from "@/lib/auth/roles";

export type AuthorizedUser = {
  uid: string;
  role: AppRole;
  isSuperAdmin: boolean;
};

function getTokenFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  return token.trim();
}

async function getRole(uid: string): Promise<AppRole | null> {
  const roleDoc = await getAdminDb().collection("user_roles").doc(uid).get();
  if (!roleDoc.exists) {
    return null;
  }

  const role = roleDoc.data()?.role;
  if (role === "admin" || role === "operator" || role === "viewer") {
    return role;
  }

  return null;
}

function parseSuperAdminUidSet() {
  const raw = process.env.FIREBASE_SUPER_ADMIN_UIDS ?? "";
  const entries = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set(entries);
}

function readBooleanClaim(decodedToken: DecodedIdToken, claimName: string) {
  const value = (decodedToken as Record<string, unknown>)[claimName];
  return value === true;
}

function resolveSuperAdmin(decodedToken: DecodedIdToken) {
  if (readBooleanClaim(decodedToken, "superAdmin") || readBooleanClaim(decodedToken, "isSuperAdmin")) {
    return true;
  }

  const roleClaim = (decodedToken as Record<string, unknown>).role;
  const appRoleClaim = (decodedToken as Record<string, unknown>).appRole;
  if (roleClaim === "super-admin" || appRoleClaim === "super-admin") {
    return true;
  }

  const superAdminUids = parseSuperAdminUidSet();
  return superAdminUids.has(decodedToken.uid);
}

export async function authorizeRequest(
  request: NextRequest,
  allowedRoles: AppRole[],
): Promise<AuthorizedUser> {
  const token = getTokenFromRequest(request);
  if (!token) {
    throw new Error("Missing bearer token");
  }

  const decodedToken = await getAdminAuth().verifyIdToken(token);
  const role = await getRole(decodedToken.uid);

  if (!role) {
    throw new Error("Role not assigned");
  }

  if (!allowedRoles.includes(role)) {
    throw new Error("Insufficient permissions");
  }

  return {
    uid: decodedToken.uid,
    role,
    isSuperAdmin: resolveSuperAdmin(decodedToken),
  };
}

export function requireSuperAdmin(user: AuthorizedUser) {
  if (!user.isSuperAdmin) {
    throw new Error("Super-admin permissions required");
  }
}
