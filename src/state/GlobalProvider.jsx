import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../api";
import { GlobalContext } from "./context";
import { customStandardId, describeStandard, rowEndpoint, rowsEndpoint } from "../standards";

const STORAGE_KEY = "qms_auth_v1";

function readStoredAuth() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return saved?.token ? saved : { user: null, token: null };
  } catch {
    return { user: null, token: null };
  }
}

// Holds the signed-in user and the clause data for every standard.
//
// Clause rows are cached per standard id in `rowsByStandard` and loaded on
// demand with loadStandard(). Edits are applied optimistically and rolled back
// if the server rejects them.
export function GlobalProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);
  const [customStandards, setCustomStandards] = useState([]);
  const [rowsByStandard, setRowsByStandard] = useState({});
  const inFlight = useRef({});
  const { user, token } = auth;

  const logout = useCallback(() => {
    setAuth({ user: null, token: null });
    setCustomStandards([]);
    setRowsByStandard({});
    inFlight.current = {};
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiFetch("/auth/login", { method: "POST", body: { email, password } });
    const next = { user: data.user, token: data.token };
    setAuth(next);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    return data.user;
  }, []);

  // Authenticated request. An expired or invalid token signs the user out.
  const request = useCallback(async (path, options = {}) => {
    try {
      return await apiFetch(path, { ...options, token });
    } catch (err) {
      if (err.status === 401 && token) logout();
      throw err;
    }
  }, [token, logout]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    const loadCustomStandards = async () => {
      try {
        const list = await request("/api/clauses/custom");
        if (!cancelled) setCustomStandards(list);
      } catch (err) {
        if (!err.cancelled) console.error("Failed to load custom standards:", err);
      }
    };
    loadCustomStandards();
    return () => { cancelled = true; };
  }, [token, request]);

  const loadStandard = useCallback((id, { force = false } = {}) => {
    if (!force && inFlight.current[id]) return inFlight.current[id];

    const standard = describeStandard(id);
    const promise = request(rowsEndpoint(standard))
      .then((rows) => {
        setRowsByStandard((prev) => ({ ...prev, [id]: rows }));
        return rows;
      })
      .catch((err) => {
        delete inFlight.current[id];
        throw err;
      });
    inFlight.current[id] = promise;
    return promise;
  }, [request]);

  const replaceRow = (id, dbId, updater) =>
    setRowsByStandard((prev) => ({
      ...prev,
      [id]: (prev[id] || []).flatMap((r) => {
        if (r.dbId !== dbId) return [r];
        const next = updater(r);
        return next ? [next] : [];
      }),
    }));

  const updateRow = useCallback(async (id, row, field, value) => {
    const standard = describeStandard(id);
    replaceRow(id, row.dbId, (r) => ({ ...r, [field]: value }));
    try {
      await request(rowEndpoint(standard, row), { method: "PATCH", body: { field, value } });
    } catch (err) {
      replaceRow(id, row.dbId, (r) => ({ ...r, [field]: row[field] }));
      throw err;
    }
  }, [request]);

  const deleteRow = useCallback(async (id, row) => {
    const standard = describeStandard(id);
    await request(rowEndpoint(standard, row), { method: "DELETE" });
    replaceRow(id, row.dbId, () => null);
  }, [request]);

  const createCustomStandard = useCallback(async (name, rows) => {
    const created = await request("/api/clauses/custom", { method: "POST", body: { name, rows } });
    setCustomStandards((prev) => [...prev, created].sort((a, b) => a.slug.localeCompare(b.slug)));
    return created.slug;
  }, [request]);

  const deleteCustomStandard = useCallback(async (slug) => {
    await request(`/api/clauses/custom/${slug}`, { method: "DELETE" });
    const id = customStandardId(slug);
    delete inFlight.current[id];
    setCustomStandards((prev) => prev.filter((s) => s.slug !== slug));
    setRowsByStandard((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [request]);

  const value = useMemo(() => ({
    user,
    token,
    login,
    logout,
    request,
    customStandards,
    rowsByStandard,
    loadStandard,
    updateRow,
    deleteRow,
    createCustomStandard,
    deleteCustomStandard,
  }), [user, token, login, logout, request, customStandards, rowsByStandard, loadStandard,
    updateRow, deleteRow, createCustomStandard, deleteCustomStandard]);

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
}
