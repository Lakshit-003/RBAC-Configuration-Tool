/**
 * Simple authenticated fetch wrapper.
 *
 * - Reads JWT from localStorage.
 * - Attaches Authorization header when present.
 * - Throws on non-OK responses with parsed error message if available.
 */

export interface ApiError extends Error {
  status?: number;
}

async function parseResponse(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const data = await parseResponse(res);
    const error: ApiError = new Error(
      (data as { error?: string })?.error || "Request failed"
    );
    error.status = res.status;
    throw error;
  }

  return (await parseResponse(res)) as T;
}
