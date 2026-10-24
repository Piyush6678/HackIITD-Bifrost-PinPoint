"use client";

import { useEffect } from "react";
import { useSession } from "@/hooks/useSession";
import type { Role } from "@/lib/constants";

// The proxy decides from the session cookie, which still holds the old role right after
// someone is promoted. Loading the session re-issues the cookie, so if the fresh role
// is allowed here, one reload gets them in.
export function RecheckAccess({ roles }: { roles: Role[] }) {
  const session = useSession();
  const allowed = session.user !== null && roles.includes(session.user.role);

  useEffect(() => {
    if (!allowed) return;
    // Once per page, in case the cookie couldn't be updated and the proxy says no again.
    const key = `recheck:${window.location.pathname}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    window.location.reload();
  }, [allowed]);

  return null;
}
