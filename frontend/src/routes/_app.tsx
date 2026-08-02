import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { readStoredToken, readStoredUser } from "@/lib/auth-storage";
import { useAuth } from "@/lib/auth-context";
import { effectiveNavKeys, type NavKey } from "@/lib/roles";

// Maps the first path segment under `/_app/...` to the NavKey used by
// ROLE_NAV, so route access matches exactly what a role can see in the
// sidebar (see lib/roles.ts). Keep this in sync when adding new pages.
const PATH_TO_NAV_KEY: Record<string, NavKey> = {
  dashboard: "dashboard",
  branches: "branches",
  directions: "directions",
  groups: "groups",
  teachers: "teachers",
  students: "students",
  "support-teachers": "supportTeachers",
  parents: "parents",
  attendance: "attendance",
  tests: "tests",
  payments: "payments",
  notifications: "notifications",
  users: "users",
  managers: "managers",
  marketing: "marketing",
  sales: "sales",
  finance: "finance",
  permissions: "permissions",
  settings: "settings",
  profile: "profile",
};

export const Route = createFileRoute("/_app")({
  // Runs before ANY page under this layout renders — this is the actual
  // login + role gate for the whole app. Without it, typing a URL directly
  // (e.g. /users) rendered the page shell for anyone, logged in or not.
  //
  // `beforeLoad` runs outside React, so it reads localStorage directly via
  // the plain (non-hook) helpers in lib/auth-storage.ts rather than
  // useAuth(). The heavier check — is this token still actually valid? —
  // happens once per load via GET /auth/me inside AuthProvider; a token
  // that GET rejects triggers the global 401 handler and bounces to /login
  // from there too.
  beforeLoad: ({ location }) => {
    // No window = we're rendering on the server. The auth token lives in
    // localStorage/sessionStorage, which simply don't exist there — reading them always
    // returned null, so this used to redirect EVERY server-rendered request (including a
    // plain page refresh, for an already-signed-in user) straight to /login before the
    // client ever got a chance to check the real state. Defer entirely to the client-side
    // check in AppLayout instead, which runs after hydration once localStorage is actually
    // readable.
    if (typeof window === "undefined") return;

    const token = readStoredToken();
    const user = readStoredUser();

    if (!token || !user) {
      throw redirect({ to: "/login", search: { from: location.pathname } });
    }

    const segment = location.pathname.split("/").filter(Boolean)[0];
    const navKey = segment ? PATH_TO_NAV_KEY[segment] : undefined;

    if (navKey && !effectiveNavKeys(user.role, user.grantedRoles ?? []).includes(navKey)) {
      // Signed in, but this role doesn't have this section — send them
      // somewhere they *do* have access to instead of a blank/broken page.
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Client-side safety net for the case beforeLoad skipped on the server (see above): once
  // hydration + the /auth/me check finish, if it turns out there's really no valid session,
  // send them to login. This is the one case genuinely unauthenticated visitors get caught.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: "/login" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
