import {
  canAdminSensitive,
  canCustomerDecide,
  canPublishVerdicts,
  canWriteOrgData,
} from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";

type Requirement = "write" | "admin" | "publish" | "decide";

function allowed(role: string, require: Requirement): boolean {
  switch (require) {
    case "admin":
      return canAdminSensitive(role);
    case "publish":
      return canPublishVerdicts(role);
    case "decide":
      return canCustomerDecide(role);
    case "write":
      return canWriteOrgData(role);
  }
}

/**
 * Server component that renders children only when the signed-in member's
 * role permits the action. Demo mode (no session) stays fully explorable —
 * the API routes behind these actions enforce the same rules server-side,
 * so this gate is UX (no dead buttons for Read-only members), not security.
 */
export async function RoleGate({
  require,
  fallback = null,
  children,
}: {
  require: Requirement;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const session = await getSessionOrg();
  if (session && !allowed(session.role, require)) return <>{fallback}</>;
  return <>{children}</>;
}
