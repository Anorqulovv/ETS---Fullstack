import { REFRESH_TOKEN_STORAGE_KEY, TOKEN_STORAGE_KEY } from "@/lib/api/client";
import type { Role } from "@/lib/roles";
import type { Gender } from "@/lib/api/types";

export interface StoredAuthUser {
  id: number | string;
  fullName: string;
  username?: string;
  phone?: string;
  role: Role;
  gender?: Gender;
  avatar?: string;
  /** Extra role-equivalent permissions a superadmin granted (see /permissions on the backend). */
  grantedRoles?: Role[];
  /** Own monthly salary (UZS), only meaningful for staff roles — shown on their own dashboard. */
  salary?: number;
}

export const USER_STORAGE_KEY = "edu-crm-user";
export { REFRESH_TOKEN_STORAGE_KEY };

/**
 * Plain (non-hook) storage readers. These exist so router `beforeLoad`
 * guards (which run outside React and can't call `useAuth`) and the
 * `AuthProvider` itself can share one source of truth instead of drifting.
 *
 * Checks sessionStorage first, then localStorage — matches the "remember me" write logic in
 * api/client.ts's setStoredTokens (unchecked = sessionStorage, checked = localStorage).
 */
function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readStoredUser(): StoredAuthUser | null {
  const raw = readStorage(USER_STORAGE_KEY);
  try {
    return raw ? (JSON.parse(raw) as StoredAuthUser) : null;
  } catch {
    return null;
  }
}

export function readStoredToken(): string | null {
  return readStorage(TOKEN_STORAGE_KEY);
}

/** Mirrors setStoredTokens in api/client.ts — writes to the same storage the tokens went to. */
export function writeStoredUser(user: StoredAuthUser, remember: boolean): void {
  try {
    const storage = remember ? window.localStorage : window.sessionStorage;
    const other = remember ? window.sessionStorage : window.localStorage;
    other.removeItem(USER_STORAGE_KEY);
    storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore storage errors (private browsing, etc.)
  }
}

export function clearStoredAuth(): void {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      storage.removeItem(TOKEN_STORAGE_KEY);
      storage.removeItem(USER_STORAGE_KEY);
      storage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      // ignore storage errors (private browsing, etc.)
    }
  }
}
