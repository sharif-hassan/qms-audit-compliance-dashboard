import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import InlineEdit from "../components/ui/InlineEdit";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import Icon from "../components/ui/Icon";
import { Alert, Button, Field, Tag } from "../components/ui/primitives";
import { useGlobal, useToast } from "../state/context";
import { parseStandardRows } from "../utils/parseStandardWorkbook";
import { plural } from "../utils/format";

const FORMATS = {
  iso27001: { label: "ISO 27001 style (flat)", tone: "blue" },
  typed: { label: "Hierarchical with Type column", tone: "green" },
  iso9001: { label: "ISO 9001 style (hierarchical)", tone: "purple" },
  generic: { label: "Generic (inferred)", tone: "amber" },
};

const GUIDES = {
  iso9001: {
    tab: "ISO 9001 / 42001 style (hierarchical)",
    intro: (
      <>
        Rows with a clause number like <code>4</code> become section headers, <code>4.1</code> become
        subsections, and anything else (e.g. <code>4.1 q1</code>) becomes a question — no Type column needed.
        You can optionally add a <code>Type</code> column with <code>header</code> / <code>question</code> values.
      </>
    ),
    columns: [
      ["Clause No.", "clause, clause no., clause number", true, "4.1 q1"],
      ["Clause", "iso clause, requirement", true, "The organization shall…"],
      ["Audit Question", "audit question", false, "What processes exist?"],
      ["Std", "std", false, "9001, 27001"],
      ["Cycle", "cycle", false, "Annual"],
      ["Evidence", "evidence", false, "Policy doc v2…"],
      ["Responsible Party", "responsible", false, "VP of Technology"],
    ],
    template: {
      file: "template_iso9001_style.xlsx",
      header: ["Clause No.", "ISO Clause", "Audit Question", "Std", "Cycle", "Evidence", "Responsible Party"],
      widths: [12, 50, 50, 20, 10, 40, 22],
      rows: [
        ["4", "Context of the Organization", "", "", "", "", ""],
        ["4.1", "Understanding the organization", "", "", "", "", ""],
        ["4.1 q1", "The organization shall determine…", "What issues have been identified?", "9001", "Annual", "Policy doc v2", "VP of Technology"],
        ["4.1 q2", "The organization shall monitor…", "How are external issues monitored?", "9001", "Annual", "", "Quality Manager"],
        ["4.2", "Understanding stakeholder needs", "", "", "", "", ""],
        ["4.2 q1", "The organization shall determine…", "Who are the interested parties?", "9001", "Annual", "", "Compliance Lead"],
      ],
    },
  },
  iso27001: {
    tab: "ISO 27001 style (flat)",
    intro: (
      <>
        Every row is a control. Rows are grouped into sections whenever the <strong>Control</strong> column
        (Organizational, People, …) changes. The first <strong>Description</strong> column becomes the clause
        title and the second the full description.
      </>
    ),
    columns: [
      ["Standard", "standard", true, "Annex A 5.1"],
      ["Control", "control", true, "Organizational"],
      ["Description (short)", "first description column", true, "Policies for Information Security"],
      ["Description (full)", "second description column", false, "Organizations must have…"],
      ["Reference", "reference", false, "AC-5, IR-6"],
      ["Evaluator Notes", "evaluator", false, "Audited externally in April…"],
      ["Responsible", "responsible", false, "IT Director"],
    ],
    template: {
      file: "template_iso27001_style.xlsx",
      header: ["Standard", "Control", "Description", "Description", "Reference", "Evaluator Notes", "Responsible"],
      widths: [14, 16, 40, 55, 18, 40, 22],
      rows: [
        ["Annex A 5.1", "Organizational", "Policies for Information Security", "Organizations must have an IS policy…", "All XX-1 controls", "Audited in April 2023…", "Compliance"],
        ["Annex A 5.2", "Organizational", "Information Security Roles", "Clearly defined IS roles and responsibilities.", "CM-9, PS-7", "", "Senior VP"],
        ["Annex A 6.1", "People", "Screening", "Background checks for all personnel.", "PS-3", "All staff screened…", "HR"],
        ["Annex A 7.1", "Physical", "Physical Security Perimeters", "Physical boundaries protect sensitive areas.", "", "Cameras and card doors.", "IT Director"],
      ],
    },
  },
};

function downloadTemplate({ file, header, widths, rows }) {
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Template");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), file);
}

function FormatGuide() {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState("iso9001");
  const guide = GUIDES[tab];

  return (
    <Panel flush>
      <button type="button" className="disclosure" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Icon name="chevronRight" size={14} strokeWidth={3} />
        <span>Supported formats &amp; column guide</span>
      </button>
      {open && (
        <div className="panel__body" style={{ borderTop: "1px solid var(--border-soft)" }}>
          <Alert tone="info">
            The uploader finds the header row automatically (title or metadata rows above it are skipped) and
            matches columns by <em>name</em>, so they can be in any order. Unrecognised columns are ignored.
          </Alert>
          <div className="tabs" role="tablist">
            {Object.entries(GUIDES).map(([id, g]) => (
              <button key={id} type="button" role="tab" className="tab" aria-selected={id === tab} onClick={() => setTab(id)}>
                {g.tab}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, marginTop: 0 }}>{guide.intro}</p>
          <div className="boxed-list table-scroll" style={{ marginBottom: 14 }}>
            <table className="data-table">
              <thead>
                <tr><th>Column</th><th>Recognised by</th><th>Required</th><th>Example</th></tr>
              </thead>
              <tbody>
                {guide.columns.map(([name, keywords, required, example]) => (
                  <tr key={name}>
                    <td className="cell-strong">{name}</td>
                    <td><code>{keywords}</code></td>
                    <td><Tag tone={required ? "accent" : "grey"}>{required ? "Required" : "Optional"}</Tag></td>
                    <td className="muted"><em>{example}</em></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" icon="download" onClick={() => downloadTemplate(guide.template)}>
            Download template (.xlsx)
          </Button>
        </div>
      )}
    </Panel>
  );
}

const PREVIEW_COLUMNS = ["Clause", "Requirement", "Audit Question", "Std", "Cycle", "Evaluator Notes", "Responsible"];
const PREVIEW_FIELDS = ["isoClause", "auditQuestion", "std", "cycle", "evaluatorNotes", "responsibleParty"];

export default function CustomISO() {
  const navigate = useNavigate();
  const toast = useToast();
  const { createCustomStandard } = useGlobal();
  const fileInput = useRef(null);

  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [format, setFormat] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const processFile = (file) => {
    setError(null);
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError("Please upload an Excel file (.xlsx or .xls).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        const parsed = parseStandardRows(raw);
        if (parsed.rows.length === 0) {
          setError("No rows found. Make sure the sheet has a header row (with columns like Clause, Standard, Control or ISO Clause) followed by data.");
          return;
        }
        setRows(parsed.rows);
        setFormat(parsed.format);
        setFileName(file.name);
        setName(file.name.replace(/\.(xlsx|xls)$/i, "").replace(/[_-]+/g, " "));
      } catch {
        setError("Couldn't read that file. Make sure it's a valid Excel workbook.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const reset = () => {
    setRows([]);
    setFileName(null);
    setFormat(null);
    setError(null);
    setSaveError(null);
    setName("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const updateCell = (index, field) => (value) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));

  const save = async () => {
    if (!name.trim()) {
      setSaveError("Enter a name for this standard.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const slug = await createCustomStandard(name.trim(), rows);
      toast.success(`Created ${name.trim()}`);
      navigate(`/custom/${slug}`);
    } catch (err) {
      setSaveError(err.message);
      setSaving(false);
    }
  };

  const questionCount = rows.filter((r) => r.type === "question").length;
  const sectionCount = rows.filter((r) => r.type === "section").length;

  return (
    <>
      <PageHeader
        eyebrow="Standards"
        title="Add a Custom Standard"
        subtitle="Import any audit checklist from Excel. The format and column layout are detected automatically."
        actions={rows.length > 0 && <Button variant="secondary" icon="upload" onClick={reset}>Upload a different file</Button>}
      />

      <div className="stack">
        <FormatGuide />

        {error && <Alert>{error}</Alert>}

        {rows.length === 0 ? (
          <div
            className={`dropzone dropzone--large${dragging ? " dropzone--active" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
          >
            <div className="dropzone__icon"><Icon name="upload" size={20} /></div>
            <div>
              <div className="dropzone__title">{dragging ? "Drop your file here" : "Drag & drop your Excel file here"}</div>
              <div className="dropzone__hint">or click to browse — accepts .xlsx and .xls</div>
            </div>
            <input ref={fileInput} type="file" accept=".xlsx,.xls" hidden onChange={(e) => processFile(e.target.files[0])} />
          </div>
        ) : (
          <>
            <Panel title="Save as standard" meta={fileName}>
              <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
                Found {plural(questionCount, "question")} in {plural(sectionCount, "section")}.{" "}
                {format && <Tag tone={FORMATS[format].tone}>Detected: {FORMATS[format].label}</Tag>}
              </p>
              {saveError && <Alert>{saveError}</Alert>}
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                <Field label="Standard name" style={{ flex: 1, minWidth: 240 }}>
                  <input className="input" value={name} onChange={(e) => { setName(e.target.value); setSaveError(null); }}
                    placeholder="e.g. ISO 31000 Risk Management" />
                </Field>
                <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save as standard"}</Button>
              </div>
              <p className="faint" style={{ fontSize: 12, marginBottom: 0 }}>
                Review and edit the rows below before saving. Once saved, the standard appears in the sidebar and
                works like ISO 9001, 27001 and 42001.
              </p>
            </Panel>

            <Panel title="Preview" flush footer={`${plural(rows.length, "row")} parsed`}>
              <div className="table-scroll">
                <table className="data-table" style={{ minWidth: 1000 }}>
                  <thead>
                    <tr>{PREVIEW_COLUMNS.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      if (row.type !== "question") {
                        return (
                          <tr key={i} className={row.type === "section" ? "row-section" : "row-subsection"}>
                            <td colSpan={PREVIEW_COLUMNS.length} style={row.type === "section" ? { padding: "10px 16px" } : undefined}>
                              <span className="clause-code">{row.clause}</span>
                              {row.isoClause !== row.clause && row.isoClause}
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={i}>
                          <td><Tag>{row.clause}</Tag></td>
                          {PREVIEW_FIELDS.map((field) => (
                            <td key={field}>
                              <InlineEdit value={row[field]} onSave={updateCell(i, field)} label={field} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}
      </div>
    </>
  );
}
