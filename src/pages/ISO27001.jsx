import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EvidenceCell from "../components/EvidenceCell";
import InlineEdit from "../components/ui/InlineEdit";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import { Alert, Button, CountPill, EmptyState, IconButton, SearchInput, Tag, TagList } from "../components/ui/primitives";
import { useGlobal } from "../state/context";
import { useStandard } from "../hooks/useStandard";
import { useFiles } from "../hooks/useFiles";
import { canDelete, canEdit } from "../permissions";
import { clausePath } from "../standards";
import { exportControls } from "../utils/exportExcel";
import { matchesSearch, plural } from "../utils/format";

const COLUMNS = [
  { label: "Control", width: "130px" },
  { label: "Category", width: "120px" },
  { label: "Title", width: "15%" },
  { label: "Description", width: "24%" },
  { label: "Reference", width: "130px" },
  { label: "Evaluator Notes & Evidence", width: "24%" },
  { label: "Responsible", width: "130px" },
];

// ISO 27001 is a flat list of Annex A controls rather than a checklist.
export default function ISO27001() {
  const { user } = useGlobal();
  const { standard, rows, loading, error, saveField, removeRow } = useStandard("iso27001");
  const files = useFiles();
  const [search, setSearch] = useState("");
  const editable = canEdit(user);

  const allRows = useMemo(() => rows || [], [rows]);
  const filtered = allRows.filter((r) =>
    matchesSearch(search.trim(), r.id, r.category, r.title, r.description, r.reference, r.evaluatorNotes, r.responsible));

  return (
    <>
      <PageHeader
        eyebrow={standard.eyebrow}
        title={standard.title}
        subtitle={standard.subtitle}
        actions={
          <>
            <CountPill>{plural(allRows.length, "control")}</CountPill>
            <Button variant="dark" icon="download" disabled={!rows}
              onClick={() => exportControls(standard, allRows, files.linksByClause)}>
              Export to Excel
            </Button>
          </>
        }
      />

      {error && <Alert>Couldn't load {standard.name}: {error}</Alert>}

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search controls, titles, descriptions…" />
        {search && <span className="toolbar__count">{plural(filtered.length, "result")}</span>}
      </div>

      <Panel flush footer={`Showing ${filtered.length} of ${plural(allRows.length, "control")}${editable ? " · Changes save automatically" : ""}`}>
        {loading && <EmptyState>Loading {standard.name}…</EmptyState>}
        {!loading && allRows.length > 0 && filtered.length === 0 && <EmptyState>No controls match “{search}”.</EmptyState>}
        {filtered.length > 0 && (
          <div className="table-scroll">
            <table className="data-table data-table--fixed" style={{ minWidth: 1100 }}>
              <colgroup>{COLUMNS.map((c) => <col key={c.label} style={{ width: c.width }} />)}</colgroup>
              <thead>
                <tr>{COLUMNS.map((c) => <th key={c.label} scope="col">{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.dbId}>
                    <td>
                      <div className="cell-id">
                        <Link to={clausePath(standard, row)} title="Open control details"><Tag>{row.id}</Tag></Link>
                        {canDelete(user) && (
                          <IconButton icon="trash" size={13} label={`Delete control ${row.id}`} onClick={() => removeRow(row, `control ${row.id}`)} />
                        )}
                      </div>
                    </td>
                    <td><InlineEdit value={row.category} onSave={saveField(row, "category")} canEdit={editable} label="category" rows={1} /></td>
                    <td>
                      <InlineEdit value={row.title} onSave={saveField(row, "title")} canEdit={editable} label="title" rows={2}
                        renderValue={(v) => <span className="cell-strong">{v}</span>} />
                    </td>
                    <td><InlineEdit value={row.description} onSave={saveField(row, "description")} canEdit={editable} label="description" rows={5} /></td>
                    <td>
                      <InlineEdit value={row.reference} onSave={saveField(row, "reference")} canEdit={editable} label="reference" rows={2}
                        renderValue={(v) => <TagList value={v} tone="grey" round={false} />} />
                    </td>
                    <td>
                      <EvidenceCell clauseId={row.dbId} notes={row.evaluatorNotes} onSaveNotes={saveField(row, "evaluatorNotes")}
                        files={files} canEdit={editable} />
                    </td>
                    <td><InlineEdit value={row.responsible} onSave={saveField(row, "responsible")} canEdit={editable} label="responsible" rows={2} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
