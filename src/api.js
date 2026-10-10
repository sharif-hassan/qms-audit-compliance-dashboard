// Thin wrapper around fetch for the QMS API.
//
// All paths are relative ("/api/...", "/auth/...") so they go through the Vite
// dev-server proxy (see vite.config.js) instead of hard-coding the backend host.

export class ApiError extends Error {
  constructor(message, status, { cancelled = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.cancelled = cancelled;
  }
}

// When the page is reloaded or closed, the browser aborts in-flight requests.
// Those aren't server failures, so they're flagged as cancelled instead.
let pageUnloading = false;
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => { pageUnloading = true; });
  window.addEventListener("pageshow", () => { pageUnloading = false; });
}

export async function apiFetch(path, { token, method = "GET", body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, { method, headers, body: payload });
  } catch {
    if (pageUnloading) throw new ApiError("Request cancelled", 0, { cancelled: true });
    throw new ApiError("Could not reach the server. Is the backend running?", 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error || data?.message || `Request failed (${res.status})`, res.status);
  }
  return data;
}

// Excel hyperlinks need an absolute URL.
export const absoluteUrl = (url) => new URL(url, window.location.origin).href;
