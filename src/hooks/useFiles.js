import { useCallback, useEffect, useMemo, useState } from "react";
import { useGlobal } from "../state/context";

// Loads uploaded evidence files and exposes the operations pages need.
// `linksByClause` maps a clause's database id to [{ file, comment }].
export function useFiles() {
  const { request } = useGlobal();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await request("/api/files");
      setFiles(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const linksByClause = useMemo(() => {
    const map = new Map();
    for (const file of files) {
      for (const clause of file.clauses || []) {
        if (!map.has(clause.id)) map.set(clause.id, []);
        map.get(clause.id).push({ file, comment: clause.comment || "" });
      }
    }
    return map;
  }, [files]);

  const deleteFile = useCallback(async (fileId) => {
    await request(`/api/files/${fileId}`, { method: "DELETE" });
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, [request]);

  const updateComment = useCallback(async (fileId, clauseId, comment) => {
    await request(`/api/files/${fileId}/clauses/${clauseId}`, { method: "PATCH", body: { comment } });
    setFiles((prev) => prev.map((f) => f.id !== fileId ? f : {
      ...f,
      clauses: f.clauses.map((c) => (c.id === clauseId ? { ...c, comment } : c)),
    }));
  }, [request]);

  const uploadFile = useCallback(async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/api/files", { method: "POST", formData });
  }, [request]);

  const attachClauses = useCallback(async (fileId, clauseIds, comment) => {
    await request(`/api/files/${fileId}/clauses`, { method: "POST", body: { clauseIds, comment } });
  }, [request]);

  const detachClause = useCallback(async (fileId, clauseId) => {
    await request(`/api/files/${fileId}/clauses/${clauseId}`, { method: "DELETE" });
    setFiles((prev) => prev.map((f) => f.id !== fileId ? f : {
      ...f,
      clauses: f.clauses.filter((c) => c.id !== clauseId),
    }));
  }, [request]);

  return {
    files, loading, error, refresh, linksByClause,
    deleteFile, updateComment, uploadFile, attachClauses, detachClause,
  };
}
