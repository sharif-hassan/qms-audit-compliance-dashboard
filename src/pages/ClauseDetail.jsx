import { Link, useParams } from "react-router-dom";
import EvidenceCell from "../components/EvidenceCell";
import FormattedText from "../components/ui/FormattedText";
import InlineEdit from "../components/ui/InlineEdit";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import Icon from "../components/ui/Icon";
import { Alert, EmptyState, Field } from "../components/ui/primitives";
import { useGlobal } from "../state/context";
import { useStandard } from "../hooks/useStandard";
import { useFiles } from "../hooks/useFiles";
import { canEdit } from "../permissions";
import { customStandardId, rowLabel } from "../standards";

const CHECKLIST_FIELDS = [
  { field: "isoClause", label: "Requirement", rows: 5, formatted: true },
  { field: "auditQuestion", label: "Audit question", rows: 4, formatted: true },
  { field: "std", label: "Std", rows: 1 },
  { field: "cycle", label: "Cycle", rows: 1 },
  { field: "responsibleParty", label: "Responsible party", rows: 2 },
];

const CONTROL_FIELDS = [
  { field: "title", label: "Title", rows: 2 },
  { field: "category", label: "Category", rows: 1 },
  { field: "description", label: "Description", rows: 5 },
  { field: "reference", label: "Reference", rows: 2 },
  { field: "responsible", label: "Responsible", rows: 2 },
];

export default function ClauseDetail({ standardId: fixedStandardId }) {
  const { slug, dbId } = useParams();
  const standardId = fixedStandardId ?? customStandardId(slug);
  const { user } = useGlobal();
  const { standard, rows, loading, error, saveField } = useStandard(standardId);
  const files = useFiles();
  const editable = canEdit(user);

  const row = rows?.find((r) => String(r.dbId) === dbId);
  const fields = standard.layout === "controls" ? CONTROL_FIELDS : CHECKLIST_FIELDS;
  const label = row ? rowLabel(standard, row) : "";
  const noun = standard.layout === "controls" ? "Control" : "Clause";

  return (
    <div className="narrow">
      <Link to={standard.path} className="back-link">
        <Icon name="arrowLeft" size={14} /> Back to {standard.name}
      </Link>

      {error && <Alert>Couldn't load {standard.name}: {error}</Alert>}
      {loading && <EmptyState>Loading…</EmptyState>}
      {!loading && !error && !row && <EmptyState>{noun} not found. It may have been deleted.</EmptyState>}

      {row && (
        <>
          <PageHeader eyebrow={standard.name} title={`${noun} ${label}`} subtitle={`${standard.title} ${noun.toLowerCase()} details`} />

          <div className="stack">
            <Panel title="Details">
              <div className="stack" style={{ gap: 18 }}>
                {fields.map(({ field, label: fieldLabel, rows: lines, formatted }) => (
                  <Field key={field} label={fieldLabel}>
                    <InlineEdit
                      boxed
                      value={row[field]}
                      onSave={saveField(row, field)}
                      canEdit={editable}
                      label={fieldLabel.toLowerCase()}
                      rows={lines}
                      renderValue={formatted ? (v) => <FormattedText text={v} /> : undefined}
                    />
                  </Field>
                ))}
              </div>
            </Panel>

            <Panel title="Evaluator notes & evidence">
              <EvidenceCell clauseId={row.dbId} notes={row.evaluatorNotes} onSaveNotes={saveField(row, "evaluatorNotes")}
                files={files} canEdit={editable} boxed />
              {!files.loading && !files.linksByClause.get(row.dbId)?.length && (
                <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>No evidence files attached yet.</p>
              )}
              {editable && (
                <Link
                  to={`/evidence?standard=${encodeURIComponent(standardId)}&clause=${row.dbId}`}
                  className="btn btn--primary"
                  style={{ marginTop: 16 }}
                >
                  <Icon name="upload" size={14} strokeWidth={2.5} /> Upload evidence
                </Link>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
