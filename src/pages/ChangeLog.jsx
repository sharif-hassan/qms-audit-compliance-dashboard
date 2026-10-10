import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import { Alert, CountPill, EmptyState, SearchInput, Tag } from "../components/ui/primitives";
import { useGlobal } from "../state/context";
import { formatDate, matchesSearch, plural } from "../utils/format";

const ACTION_TONES = {
  FILE_UPLOADED: "green",
  FILE_DELETED: "red",
  CLAUSE_ATTACHED: "blue",
  CLAUSE_DETACHED: "amber",
  CLAUSE_UPDATED: "blue",
  CLAUSE_DELETED: "red",
  STANDARD_CREATED: "green",
  STANDARD_DELETED: "red",
  USER_CREATED: "purple",
  USER_UPDATED: "purple",
  USER_DELETED: "red",
};

export default function ChangeLog() {
  const { request } = useGlobal();
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    request("/api/changelog")
      .then(setLogs)
      .catch((err) => setError(err.message));
  }, [request]);

  const filtered = useMemo(
    () => (logs || []).filter((l) => matchesSearch(query.trim(), l.action, l.description, l.performedBy)),
    [logs, query],
  );

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Change Log"
        subtitle="Audit trail of every edit, upload and account change"
        actions={logs && <CountPill>{plural(logs.length, "event")}</CountPill>}
      />

      {error && <Alert>Couldn't load the change log: {error}</Alert>}

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search actions, descriptions, people…" />
      </div>

      <Panel title="Activity" flush footer={`Showing ${filtered.length} of ${plural(logs?.length ?? 0, "event")} (most recent 500)`}>
        {!logs && !error && <EmptyState>Loading…</EmptyState>}
        {logs && filtered.length === 0 && <EmptyState>{logs.length ? "No events match" : "No activity yet"}</EmptyState>}
        {filtered.map((log) => (
          <div key={log.id} className="list-row" style={{ alignItems: "flex-start" }}>
            <Tag tone={ACTION_TONES[log.action] ?? "grey"} style={{ minWidth: 132, textAlign: "center" }}>
              {log.action.replace(/_/g, " ")}
            </Tag>
            <div className="list-row__main">
              <div style={{ fontSize: 13 }}>{log.description}</div>
              <div className="list-row__sub">{log.performedBy} · {formatDate(log.createdAt, { withTime: true })}</div>
            </div>
          </div>
        ))}
      </Panel>
    </>
  );
}
