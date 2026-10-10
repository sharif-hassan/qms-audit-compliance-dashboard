import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import Icon from "../components/ui/Icon";
import { Alert, Button, EmptyState, IconButton, SearchInput, Tag } from "../components/ui/primitives";
import { useGlobal, useToast } from "../state/context";
import { useFiles } from "../hooks/useFiles";
import { describeStandard, rawClauseLabel, rawClauseText, standardIdFromDb } from "../standards";
import { formatBytes, formatDate, plural } from "../utils/format";

const MAX_RESULTS = 25;

function ClauseRow({ clause, standardName, action }) {
  return (
    <div className="list-row">
      <Tag tone="grey">{standardName}</Tag>
      <Tag>{rawClauseLabel(clause)}</Tag>
      <div className="list-row__main">
        <div className="list-row__title" title={rawClauseText(clause)}>{rawClauseText(clause)}</div>
      </div>
      {action}
    </div>
  );
}

export default function Files() {
  const { request, customStandards } = useGlobal();
  const toast = useToast();
  const { files, loading, error, deleteFile, attachClauses, detachClause, refresh } = useFiles();
  const [clauses, setClauses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [fileQuery, setFileQuery] = useState("");
  const [clauseQuery, setClauseQuery] = useState("");

  useEffect(() => {
    request("/api/clauses")
      .then((data) => setClauses(data.filter((c) => c.type === "question")))
      .catch((err) => toast.error(`Couldn't load clauses: ${err.message}`));
  }, [request, toast]);

  const standardName = (dbStandard) => describeStandard(standardIdFromDb(dbStandard), customStandards)?.name ?? dbStandard;

  const fileFuse = useMemo(() => new Fuse(files, { keys: ["name"], threshold: 0.35 }), [files]);
  const clauseFuse = useMemo(
    () => new Fuse(clauses, { keys: ["code", "title", "isoClause", "auditQuestion"], threshold: 0.35 }),
    [clauses],
  );

  const shownFiles = fileQuery.trim() ? fileFuse.search(fileQuery.trim()).map((r) => r.item) : files;
  const selected = files.find((f) => f.id === selectedId) ?? null;
  const attached = selected ? [...selected.clauses].sort((a, b) => a.code.localeCompare(b.code)) : [];
  const attachedIds = new Set(attached.map((c) => c.id));
  const available = (clauseQuery.trim() ? clauseFuse.search(clauseQuery.trim()).map((r) => r.item) : clauses)
    .filter((c) => !attachedIds.has(c.id));

  const remove = async (file) => {
    if (!window.confirm(`Delete "${file.name}"? It will be removed from every clause it's attached to.`)) return;
    try {
      await deleteFile(file.id);
      if (selectedId === file.id) setSelectedId(null);
      toast.success(`Deleted ${file.name}`);
    } catch (err) {
      toast.error(`Couldn't delete file: ${err.message}`);
    }
  };

  const attach = async (clause) => {
    try {
      await attachClauses(selected.id, [clause.id]);
      await refresh();
    } catch (err) {
      toast.error(`Couldn't attach clause: ${err.message}`);
    }
  };

  const detach = async (clause) => {
    try {
      await detachClause(selected.id, clause.id);
    } catch (err) {
      toast.error(`Couldn't detach clause: ${err.message}`);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Document Management"
        title="Files"
        subtitle="Every uploaded evidence file and the clauses it supports"
      />
      {error && <Alert>Couldn't load files: {error}</Alert>}

      <div className="split">
        <Panel title="Uploaded files" flush footer={plural(files.length, "file")}>
          <div style={{ padding: 12, borderBottom: "1px solid var(--border-soft)", background: "var(--surface-2)" }}>
            <SearchInput value={fileQuery} onChange={setFileQuery} placeholder="Search files…" className="search--full" />
          </div>
          <div className="scroll-list">
            {loading && <EmptyState>Loading files…</EmptyState>}
            {!loading && shownFiles.length === 0 && <EmptyState>{files.length ? "No files match" : "No files uploaded yet"}</EmptyState>}
            {shownFiles.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center" }}>
                <button
                  type="button"
                  className={`list-row list-row--button${f.id === selectedId ? " list-row--selected" : ""}`}
                  onClick={() => setSelectedId(f.id)}
                  aria-pressed={f.id === selectedId}
                >
                  <div className="file-icon"><Icon name="file" size={13} /></div>
                  <div className="list-row__main">
                    <div className="list-row__title">{f.name}</div>
                    <div className="list-row__sub">
                      {formatDate(f.uploadedAt)} · {formatBytes(f.sizeBytes)} · {plural(f.clauses.length, "clause")}
                    </div>
                  </div>
                </button>
                <IconButton icon="trash" label={`Delete ${f.name}`} onClick={() => remove(f)} style={{ marginRight: 10 }} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Attached clauses"
          meta={selected?.name}
          flush
          footer={selected ? `${plural(attached.length, "clause")} attached` : "No file selected"}
        >
          {!selected ? (
            <EmptyState>Select a file on the left to see and manage its clauses</EmptyState>
          ) : (
            <div className="panel__body">
              <div style={{ marginBottom: 16 }}>
                <a href={selected.url} target="_blank" rel="noopener noreferrer" className="btn btn--secondary btn--sm">
                  <Icon name="link" size={12} /> Open file
                </a>
              </div>

              <div className="section-label">Currently attached</div>
              {attached.length === 0 ? (
                <EmptyState boxed>No clauses attached to this file yet</EmptyState>
              ) : (
                <div className="boxed-list">
                  {attached.map((c) => (
                    <ClauseRow key={c.id} clause={c} standardName={standardName(c.standard)}
                      action={<Button size="sm" variant="secondary" onClick={() => detach(c)}>Detach</Button>} />
                  ))}
                </div>
              )}

              <div className="divider" />

              <div className="section-label">Attach another clause</div>
              <SearchInput value={clauseQuery} onChange={setClauseQuery} placeholder="Search clauses by number or text…" className="search--full" />
              <div className="boxed-list" style={{ marginTop: 12 }}>
                {available.length === 0 && <EmptyState>No available clauses match</EmptyState>}
                {available.slice(0, MAX_RESULTS).map((c) => (
                  <ClauseRow key={c.id} clause={c} standardName={standardName(c.standard)}
                    action={<Button size="sm" icon="plus" onClick={() => attach(c)}>Attach</Button>} />
                ))}
              </div>
              {available.length > MAX_RESULTS && (
                <p className="faint" style={{ fontSize: 12, textAlign: "center" }}>
                  Showing the first {MAX_RESULTS} of {available.length} — narrow your search to see more
                </p>
              )}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
