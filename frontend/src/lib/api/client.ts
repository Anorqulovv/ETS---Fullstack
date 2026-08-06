import axios, { type AxiosRequestConfig } from "axios";

// Base URL comes from .env (VITE_API_BASE_URL). Currently points at
// edu-najottalim.uz. Change it there — never hardcode it here.
const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

export const TOKEN_STORAGE_KEY = "edu-crm-token";
export const REFRESH_TOKEN_STORAGE_KEY = "edu-crm-refresh-token";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

/**
 * "Remember me" = localStorage (survives closing the browser) vs sessionStorage (cleared once
 * the tab/browser closes, but survives a plain page refresh). Reads check sessionStorage first
 * since that's the more restrictive/explicit choice — on a fresh browser launch it'll be empty,
 * naturally falling through to localStorage only for sessions that opted to be remembered.
 */
function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function getStoredToken(): string | null {
  return readStorage(TOKEN_STORAGE_KEY);
}

function getStoredRefreshToken(): string | null {
  return readStorage(REFRESH_TOKEN_STORAGE_KEY);
}

function activeStorage(): Storage {
  try {
    if (window.sessionStorage.getItem(TOKEN_STORAGE_KEY)) return window.sessionStorage;
  } catch {
    // fall through to localStorage
  }
  return window.localStorage;
}

/**
 * Used by login.tsx (with an explicit `remember` choice) and the silent token-refresh flow
 * below (which omits it, and just keeps using whichever storage the session already started
 * in). Always clears the other storage too, so switching "remember me" between logins never
 * leaves a stale copy sitting in both places at once.
 */
export function setStoredTokens(accessToken: string, refreshToken?: string, remember?: boolean): void {
  try {
    const storage = remember === undefined ? activeStorage() : remember ? window.localStorage : window.sessionStorage;
    const other = storage === window.localStorage ? window.sessionStorage : window.localStorage;
    other.removeItem(TOKEN_STORAGE_KEY);
    other.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    storage.setItem(TOKEN_STORAGE_KEY, accessToken);
    if (refreshToken) {
      storage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    }
  } catch {
    // ignore storage errors (private browsing, etc.)
  }
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Listeners the auth context can subscribe to, so a 401 anywhere logs the
// user out and sends them back to /login without every hook needing to know.
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();
export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

/**
 * Access tokens are short-lived (ACCESS_TOKEN_TIME in the backend's .env — 900s/15min by
 * default). Without this, a token expiring mid-session meant every request — including the
 * `/auth/me` check that runs on every page load — started 401ing, which logged the person out
 * on the very next refresh even though they never explicitly signed out. This transparently
 * exchanges the refresh token for a new access token once, then retries whatever failed.
 */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const storedRefreshToken = getStoredRefreshToken();
  if (!storedRefreshToken) return null;

  try {
    const { data } = await axios.post(`${baseURL}/auth/refresh`, {
      refreshToken: storedRefreshToken,
    });
    const nextAccessToken: string | undefined = data?.data?.token?.accessToken;
    const nextRefreshToken: string | undefined = data?.data?.token?.refreshToken;
    if (!nextAccessToken) return null;
    setStoredTokens(nextAccessToken, nextRefreshToken);
    return nextAccessToken;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url = originalRequest?.url ?? "";
    const isLoginCall = url.includes("/auth/login");
    const isRefreshCall = url.includes("/auth/refresh");

    // A failed login attempt (wrong password) is not a "session expired" event — let the
    // login form show its own error, no global logout/redirect.
    if (isLoginCall) {
      return Promise.reject(error);
    }

    // The refresh call itself failed (refresh token expired/invalid too), or this request
    // already tried refreshing once and still got a 401 — nothing left to try.
    if (isRefreshCall || !originalRequest || originalRequest._retried) {
      unauthorizedListeners.forEach((l) => l());
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    // Multiple requests can 401 around the same moment (e.g. a page firing several
    // queries at once right as the token expires) — share one in-flight refresh instead
    // of racing several /auth/refresh calls that would each rotate the refresh token.
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;
    if (!newToken) {
      unauthorizedListeners.forEach((l) => l());
      return Promise.reject(error);
    }

    originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newToken}` };
    return api.request(originalRequest);
  },
);

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: unknown;
}

/**
 * Backends disagree on pagination envelopes. This normalizes the common
 * shapes (data/total, items/count, results/count, or a bare array) into a
 * single { data, total } shape the UI relies on. If edu-najottalim.uz uses a
 * different shape, add it here.
 */
/**
 * Several backend list endpoints don't fully implement search/pagination server-side — some read
 * `name` but the client only ever sent `search` (so the filter was silently ignored), and some
 * (e.g. GET /students) don't take a query at all and just return every row. This normalizes
 * whatever the backend sends: real pagination metadata is trusted as-is; a bare array gets
 * search-filtered and page-sliced here so the table's search box and pager still work.
 */
function normalizePaginated<T>(
  payload: unknown,
  fallbackLimit: number,
  params: { page?: number; limit?: number; search?: string } = {},
): Paginated<T> {
  // Unwrap whatever shape the backend sent: a bare array, or an object with the array under
  // data/items/results/content (this backend's succesRes() always wraps as
  // {statusCode, message, data: [...]}, so it's almost always the latter).
  let rows: T[];
  let serverTotal: number | undefined;
  if (Array.isArray(payload)) {
    rows = payload;
  } else if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    rows = (p.data ?? p.items ?? p.results ?? p.content ?? []) as T[];
    const total = p.total ?? p.count ?? p.totalCount ?? p.totalElements;
    if (typeof total === "number") serverTotal = total;
  } else {
    rows = [];
  }

  // A real total (different from rows.length, or explicitly provided by a paginated envelope)
  // means the backend already searched/paginated — trust it as-is. Otherwise this is a bare,
  // unfiltered, unpaginated array (many endpoints here are — see e.g. GET /students), so search
  // and page-slice it here instead of silently ignoring both.
  if (serverTotal !== undefined && serverTotal !== rows.length) {
    return { data: rows, total: serverTotal };
  }

  const term = params.search?.trim().toLowerCase();
  if (term) {
    rows = rows.filter((row) => {
      const r = row as Record<string, unknown>;
      const nested = (r.user ?? r.parent ?? {}) as Record<string, unknown>;
      const haystack = [r.fullName, r.name, r.title, r.username, r.phone, nested.fullName, nested.username, nested.phone]
        .filter((v) => typeof v === "string")
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }
  const total = rows.length;
  const page = params.page ?? 1;
  const limit = params.limit ?? fallbackLimit;
  const start = (page - 1) * limit;
  return { data: rows.slice(start, start + limit), total };
}

export async function apiList<T>(resource: string, params: ListParams = {}): Promise<Paginated<T>> {
  const { page = 1, limit = 10, search, ...rest } = params;
  // Send both keys: `search` for any endpoint that reads that name, `name` for the (more common)
  // convention most services here actually implement (see e.g. TeacherService.findAll).
  const query: Record<string, unknown> = { page, limit, ...rest };
  if (search) {
    query.search = search;
    query.name = search;
  }
  const { data } = await api.get(resource, { params: query });
  return normalizePaginated<T>(data, limit, { page, limit, search: search as string | undefined });
}

export async function apiGet<T>(resource: string, id: number | string): Promise<T> {
  const { data } = await api.get(`${resource}/${id}`);
  return (data?.data ?? data) as T;
}

export async function apiCreate<T>(resource: string, payload: Partial<T>): Promise<T> {
  const { data } = await api.post(resource, payload);
  return (data?.data ?? data) as T;
}

export async function apiUpdate<T>(
  resource: string,
  id: number | string,
  payload: Partial<T>,
): Promise<T> {
  const { data } = await api.patch(`${resource}/${id}`, payload);
  return (data?.data ?? data) as T;
}

export async function apiRemove(resource: string, id: number | string): Promise<void> {
  await api.delete(`${resource}/${id}`);
}

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const { data } = await api.request(config);
  return (data?.data ?? data) as T;
}
