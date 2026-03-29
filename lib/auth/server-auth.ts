import type { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { AppRole } from "@/lib/auth/roles";

export type AuthorizedUser = {
  uid: string;
  role: AppRole;
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

  return { uid: decodedToken.uid, role };
}
