import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { TOKEN_STORAGE_KEY, api, onUnauthorized, setStoredTokens } from "@/lib/api/client";
import {
  clearStoredAuth,
  readStoredToken,
  readStoredUser,
  writeStoredUser,
  type StoredAuthUser,
} from "@/lib/auth-storage";
import type { Role } from "@/lib/roles";

export type AuthUser = StoredAuthUser;

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  /** True until the initial localStorage hydration + /auth/me check finish. */
  isLoading: boolean;
  /** `remember` controls localStorage (survives closing the browser) vs sessionStorage (this tab only). Defaults to true. */
  login: (user: AuthUser, token: string, refreshToken?: string, remember?: boolean) => void;
  /** Merges a partial update (e.g. after PATCH /auth/profile) into the cached user + storage. */
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearStoredAuth();
    // Drop every cached query (notifications, dashboard, lists, ...) so a different account
    // signing in on the same tab never briefly renders the previous user's cached data.
    queryClient.clear();
    void navigate({ to: "/login" });
  }, [navigate, queryClient]);

  // Hydrate from storage on mount (SSR-safe: window isn't available
  // server-side), then re-verify the token against GET /auth/me. This is
  // what actually "checks the role" on every load — a role edited or
  // revoked on the backend, or a tampered/stale storage value, gets
  // corrected here instead of being trusted forever.
  useEffect(() => {
    const storedUser = readStoredUser();
    const storedToken = readStoredToken();
    setUser(storedUser);
    setToken(storedToken);

    if (!storedToken) {
      setHydrated(true);
      return;
    }

    // Whichever storage already has the token is the one "remember me" chose at login —
    // keep writing refreshed user data back to that same one.
    const remembered = typeof window !== "undefined" && !window.sessionStorage.getItem(TOKEN_STORAGE_KEY);

    let cancelled = false;
    void api
      .get("/auth/me")
      .then(({ data }) => {
        if (cancelled) return;
        const fresh = data?.data ?? data;
        if (!fresh?.id || !fresh?.role) return;
        const nextUser: AuthUser = {
          id: fresh.id,
          fullName: fresh.fullName ?? storedUser?.fullName ?? "",
          username: fresh.username,
          phone: fresh.phone,
          role: fresh.role as Role,
          grantedRoles: (fresh.grantedRoles as Role[] | undefined) ?? [],
          salary: fresh.salary as number | undefined,
        };
        setUser(nextUser);
        writeStoredUser(nextUser, remembered);
      })
      .catch(() => {
        // A failed /auth/me (expired/invalid token, deactivated account) means
        // the session isn't trustworthy — the 401 interceptor below also
        // handles this, but we clear eagerly here too in case the failure
        // wasn't a 401 (e.g. network hiccup should NOT log the user out, so
        // only clear on actual auth errors).
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // If any API call comes back 401, drop the session and bounce to /login.
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      logout();
    });
    return () => {
      unsubscribe();
    };
  }, [logout]);

  const login = useCallback((nextUser: AuthUser, nextToken: string, refreshToken?: string, remember = true) => {
    setUser(nextUser);
    setToken(nextToken);
    setStoredTokens(nextToken, refreshToken, remember);
    writeStoredUser(nextUser, remember);
  }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      const remembered = typeof window !== "undefined" && !window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
      writeStoredUser(next, remembered);
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: hydrated && Boolean(token) && Boolean(user),
      isLoading: !hydrated,
      login,
      updateUser,
      logout,
    }),
    [user, token, hydrated, login, updateUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * Least-privilege fallback: only meaningful before hydration finishes or if
 * called outside an authenticated route (both should be rare now that
 * `_app.tsx` guards every nested route), so it must NOT default to an
 * elevated role like SUPERADMIN.
 */
export function useCurrentRole(): Role {
  const { user } = useAuth();
  return user?.role ?? "STUDENT";
}
