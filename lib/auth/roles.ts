export const APP_ROLES = ["admin", "operator", "viewer"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const rolePriority: Record<AppRole, number> = {
  admin: 3,
  operator: 2,
  viewer: 1,
};

export function hasMinimumRole(currentRole: AppRole, requiredRole: AppRole) {
  return rolePriority[currentRole] >= rolePriority[requiredRole];
}
