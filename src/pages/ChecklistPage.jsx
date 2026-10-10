import { useMemo, useState } from "react";
import ChecklistTable from "../components/ChecklistTable";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import { Alert, Button, CountPill, EmptyState, SearchInput } from "../components/ui/primitives";
import { useGlobal } from "../state/context";
import { useStandard } from "../hooks/useStandard";
import { useFiles } from "../hooks/useFiles";
import { canDelete, canEdit } from "../permissions";
import { isQuestion } from "../standards";
import { groupChecklist } from "../utils/checklist";
import { exportChecklist } from "../utils/exportExcel";
import { plural } from "../utils/format";

// Large checklists start collapsed so the page isn't a wall of rows.
const COLLAPSE_THRESHOLD = 40;

// Page for every hierarchical standard: ISO 9001, ISO 42001 and custom uploads.
export default function ChecklistPage({ standardId, actions }) {
  const { user } = useGlobal();
  const { standard, rows, loading, error, saveField, removeRow } = useStandard(standardId);
  const files = useFiles();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null); // null = default for the size of the list

  const allRows = useMemo(() => rows || [], [rows]);
  const groups = useMemo(() => groupChecklist(allRows, search.trim()), [allRows, search]);
  const questionCount = allRows.filter(isQuestion).length;
  const shownCount = groups.reduce((n, g) => n + g.questionCount, 0);

  const defaultOpen = questionCount <= COLLAPSE_THRESHOLD;
  // Rows that come before any section header have no toggle, so always show them.
  const isExpanded = (key) =>
    key.startsWith("g-") || Boolean(search.trim()) || (expanded ? expanded.has(key) : defaultOpen);
  const allKeys = () => new Set(groupChecklist(allRows).map((g) => g.key));
  const toggle = (key) => {
    const next = new Set(expanded ?? (defaultOpen ? allKeys() : []));
    if (next.has(key)) next.delete(key); else next.add(key);
    setExpanded(next);
  };

  return (
    <>
      <PageHeader
        eyebrow={standard.eyebrow}
        title={standard.title}
        subtitle={standard.subtitle}
        actions={
          <>
            <CountPill>{plural(questionCount, "question")}</CountPill>
            <Button variant="dark" icon="download" disabled={!rows}
              onClick={() => exportChecklist(standard, allRows, files.linksByClause)}>
              Export to Excel
            </Button>
            {actions}
          </>
        }
      />

      {error && <Alert>Couldn't load {standard.name}: {error}</Alert>}

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search clauses, requirements, questions…" />
        <Button variant="soft" onClick={() => setExpanded(allKeys())} disabled={Boolean(search)}>Expand all</Button>
        <Button variant="secondary" onClick={() => setExpanded(new Set())} disabled={Boolean(search)}>Collapse all</Button>
        {search && <span className="toolbar__count">{plural(shownCount, "result")}</span>}
      </div>

      <Panel
        flush
        footer={`Showing ${shownCount} of ${plural(questionCount, "question")}${canEdit(user) ? " · Changes save automatically" : ""}`}
      >
        {loading && <EmptyState>Loading {standard.name}…</EmptyState>}
        {!loading && allRows.length === 0 && !error && <EmptyState>This standard has no clauses yet.</EmptyState>}
        {!loading && allRows.length > 0 && groups.length === 0 && <EmptyState>No clauses match “{search}”.</EmptyState>}
        {groups.length > 0 && (
          <ChecklistTable
            standard={standard}
            groups={groups}
            isExpanded={isExpanded}
            onToggle={toggle}
            files={files}
            canEdit={canEdit(user)}
            canDelete={canDelete(user)}
            saveField={saveField}
            removeRow={removeRow}
          />
        )}
      </Panel>
    </>
  );
}
