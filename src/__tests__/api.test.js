import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "../api";

const respond = (status, body) => vi.fn().mockResolvedValue({ ok: status < 400, status, json: () => Promise.resolve(body) });

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("sends the bearer token and JSON body", async () => {
    const fetchMock = respond(200, { ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/things", { token: "abc", method: "POST", body: { a: 1 } });

    expect(fetchMock).toHaveBeenCalledWith("/api/things", {
      method: "POST",
      headers: { Authorization: "Bearer abc", "Content-Type": "application/json" },
      body: JSON.stringify({ a: 1 }),
    });
  });

  it("throws an ApiError with the server's message and status", async () => {
    vi.stubGlobal("fetch", respond(403, { ok: false, message: "Forbidden" }));
    await expect(apiFetch("/api/users")).rejects.toMatchObject({ name: "ApiError", status: 403, message: "Forbidden" });
  });

  it("reports an unreachable server clearly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const err = await apiFetch("/api/x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toMatch(/could not reach the server/i);
  });
});

describe("apiFetch during page unload", () => {
  it("marks requests aborted by a reload as cancelled instead of 'server unreachable'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    window.dispatchEvent(new Event("beforeunload"));
    const err = await apiFetch("/api/x").catch((e) => e);
    window.dispatchEvent(new Event("pageshow"));

    expect(err).toMatchObject({ name: "ApiError", cancelled: true });
    expect(err.message).not.toMatch(/could not reach/i);
  });
});
