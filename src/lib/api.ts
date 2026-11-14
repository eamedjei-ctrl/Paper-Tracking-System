/**
 * Single entry point for all backend calls. The backend is a separate service —
 * see docs/BACKEND_API.md for the contract it must implement.
 *
 * NEXT_PUBLIC_API_URL  e.g. "https://api.papertrail.app" or "http://localhost:4000".
 * When unset, the app runs in demo mode only and never calls a backend.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const backendEnabled = API_URL.length > 0;

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export const apiUrl = (path: string) => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** fetch wrapper: sends the session cookie, parses JSON, throws ApiError with the backend's `error` message. */
export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  if (!backendEnabled) throw new ApiError("Backend not configured", 503);
  const { json, headers, ...rest } = init;
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    ...rest,
    headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError((data as { error?: string } | null)?.error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}
