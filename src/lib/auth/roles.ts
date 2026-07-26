/**
 * G1 roles — DB keeps owner|admin|member|viewer;
 * product language: Admin / Manager / Read-only.
 */

export type DbRole = "owner" | "admin" | "member" | "viewer";

export type ProductRole = "admin" | "manager" | "readonly";

export function toProductRole(dbRole: string): ProductRole {
  if (dbRole === "owner" || dbRole === "admin") return "admin";
  if (dbRole === "member") return "manager";
  return "readonly";
}

export function productRoleLabel(role: ProductRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "readonly":
      return "Read-only";
  }
}

/** Invite/create roles (cannot invite owner). */
export type InviteRole = "admin" | "member" | "viewer";

export function canManageTeam(dbRole: string): boolean {
  return dbRole === "owner" || dbRole === "admin";
}

export function canWriteOrgData(dbRole: string): boolean {
  return dbRole !== "viewer";
}

/** TIN / API keys / white-label / webhooks — admin only. */
export function canAdminSensitive(dbRole: string): boolean {
  return dbRole === "owner" || dbRole === "admin";
}

/** Full audit forensics (IP, UA, raw JSON) — Admin / founder only. */
export function canViewFullAudit(dbRole: string): boolean {
  return canAdminSensitive(dbRole);
}

export function canPublishVerdicts(dbRole: string): boolean {
  return dbRole === "owner" || dbRole === "admin";
}

export function canCustomerDecide(dbRole: string): boolean {
  return dbRole !== "viewer";
}
