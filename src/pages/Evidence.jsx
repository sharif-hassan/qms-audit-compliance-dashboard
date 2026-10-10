import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import Icon from "../components/ui/Icon";
import { Alert, Button, EmptyState, IconButton, SearchInput, Tag } from "../components/ui/primitives";
import { useGlobal, useToast } from "../state/context";
import { useFiles } from "../hooks/useFiles";
import { allStandards, describeStandard, isQuestion, rowLabel } from "../standards";
import { formatBytes, matchesSearch, plural } from "../utils/format";

function optionText(standard, row) {
  return standard.layout === "controls" ? row.title : row.isoClause || row.auditQuestion;
}

export default function Evidence() {
  const { customStandards, rowsByStandard, loadStandard } = useGlobal();
  const { uploadFile, attachClauses } = useFiles();
  const toast = useToast();
  const [params] = useSearchParams();
  const initialClause = Number(params.get("clause")) || null;
  const fileInput = useRef(null);

  const [activeId, setActiveId] = useState(params.get("standard") || "iso9001");
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(initialClause ? [initialClause] : []);
  const [comments, setComments] = useState({});
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const standards = allStandards(customStandards);
  const standard = describeStandard(activeId, customStandards);
  const rows = rowsByStandard[activeId];

  useEffect(() => {
    let cancelled = false;
    loadStandard(activeId)
      .then(() => { if (!cancelled) setLoadError(null); })
      .catch((err) => { if (!cancelled) setLoadError(err.message); });
    return () => { cancelled = true; };
  }, [activeId, loadStandard]);

  const options = useMemo(() => (rows || []).filter(isQuestion), [rows]);
  const filtered = options.filter((r) => matchesSearch(search.trim(), rowLabel(standard, r), optionText(standard, r)));
  const byId = new Map(options.map((r) => [r.dbId, r]));

  const switchTab = (id) => {
    setActiveId(id);
    setSelected([]);
    setComments({});
    setSearch("");
  };

  const toggle = (dbId) =>
    setSelected((prev) => (prev.includes(dbId) ? prev.filter((id) => id !== dbId) : [...prev, dbId]));

  // Copy the FileList right away: it's live and is emptied when the input resets.
  const addFiles = (list) => {
    const added = Array.from(list);
    setFiles((prev) => [...prev, ...added]);
  };

  const upload = async () => {
    setUploading(true);
    try {
      for (const file of files) {
        const uploaded = await uploadFile(file);
        // One request per clause so each link keeps its own comment.
        for (const clauseId of selected) {
          await attachClauses(uploaded.id, [clauseId], comments[clauseId] || null);
        }
      }
      toast.success(`Uploaded ${plural(files.length, "file")} to ${plural(selected.length, "clause")}`);
      setFiles([]);
      setSelected([]);
      setComments({});
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const ready = files.length > 0 && selected.length > 0 && !uploading;

  return (
    <div className="narrow">
      <PageHeader
        eyebrow="Audit Management"
        title="Evidence Upload"
        subtitle="Attach files and comments to clauses in any standard"
      />

      <div className="tabs" role="tablist">
        {standards.map((s) => (
          <button key={s.id} type="button" role="tab" className="tab" aria-selected={s.id === activeId} onClick={() => switchTab(s.id)}>
            {s.name}
          </button>
        ))}
      </div>

      <Panel title={`Upload evidence for ${standard.name}`} meta={selected.length > 0 && `${plural(selected.length, "clause")} selected`}>
        <div className="stack" style={{ gap: 24 }}>
          <section>
            <div className="section-label">1. Choose files</div>
            <div
              className="dropzone"
              role="button"
              tabIndex={0}
              onClick={() => fileInput.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            >
              <div className="dropzone__icon"><Icon name="upload" size={18} strokeWidth={2.5} /></div>
              <div>
                <div className="dropzone__title">Click to browse or drop files here</div>
                <div className="dropzone__hint">Any file type, multiple allowed (50 MB max each)</div>
              </div>
              <input ref={fileInput} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </div>

            {files.length > 0 && (
              <div className="boxed-list" style={{ marginTop: 12 }}>
                {files.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="list-row">
                    <div className="file-icon"><Icon name="file" size={13} /></div>
                    <div className="list-row__main">
                      <div className="list-row__title">{file.name}</div>
                      <div className="list-row__sub">{formatBytes(file.size)}</div>
                    </div>
                    <IconButton icon="x" label={`Remove ${file.name}`} onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="section-label">2. Select clauses</div>
            {loadError && <Alert>Couldn't load clauses: {loadError}</Alert>}
            <div className="boxed-list">
              <div style={{ padding: 10, borderBottom: "1px solid var(--border-soft)", background: "var(--surface-2)" }}>
                <SearchInput value={search} onChange={setSearch} placeholder="Search clauses…" className="search--full" />
              </div>
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {!rows && !loadError && <EmptyState>Loading clauses…</EmptyState>}
                {rows && filtered.length === 0 && <EmptyState>No clauses found</EmptyState>}
                {filtered.map((row) => (
                  <label key={row.dbId} className="check-row">
                    <input type="checkbox" checked={selected.includes(row.dbId)} onChange={() => toggle(row.dbId)} />
                    <Tag>{rowLabel(standard, row)}</Tag>
                    <span className="list-row__title" style={{ whiteSpace: "normal" }}>{optionText(standard, row)?.slice(0, 120)}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {selected.length > 0 && (
            <section>
              <div className="section-label">3. Comments (optional)</div>
              <div className="stack" style={{ gap: 12 }}>
                {selected.map((dbId) => {
                  const row = byId.get(dbId);
                  return (
                    <label key={dbId} className="field">
                      <span><Tag>{row ? rowLabel(standard, row) : dbId}</Tag></span>
                      <textarea
                        className="textarea"
                        rows={2}
                        placeholder="Comment for this clause…"
                        value={comments[dbId] || ""}
                        onChange={(e) => setComments((prev) => ({ ...prev, [dbId]: e.target.value }))}
                      />
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          <Button block icon="upload" onClick={upload} disabled={!ready}>
            {uploading ? "Uploading…" : `Upload evidence (${plural(files.length, "file")})`}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
