import { Link } from "react-router-dom";
import InlineEdit from "./ui/InlineEdit";
import FormattedText from "./ui/FormattedText";
import Icon from "./ui/Icon";
import EvidenceCell from "./EvidenceCell";
import { IconButton, Tag, TagList } from "./ui/primitives";
import { clausePath } from "../standards";
import { plural } from "../utils/format";

const COLUMNS = [
  { label: "Clause", width: "120px" },
  { label: "Requirement", width: "24%" },
  { label: "Audit Question", width: "22%" },
  { label: "Std", width: "96px" },
  { label: "Cycle", width: "104px" },
  { label: "Evidence", width: "20%" },
  { label: "Responsible", width: "140px" },
];

// Section → subsection → question table shared by ISO 9001, ISO 42001 and
// custom standards. `groups` comes from groupChecklist().
export default function ChecklistTable({
  standard, groups, isExpanded, onToggle, files, canEdit, canDelete, saveField, removeRow,
}) {
  return (
    <div className="table-scroll">
      <table className="data-table data-table--fixed" style={{ minWidth: 1100 }}>
        <colgroup>{COLUMNS.map((c) => <col key={c.label} style={{ width: c.width }} />)}</colgroup>
        <thead>
          <tr>{COLUMNS.map((c) => <th key={c.label} scope="col">{c.label}</th>)}</tr>
        </thead>
        {groups.map((group) => {
          const open = isExpanded(group.key);
          return (
            <tbody key={group.key}>
              {group.section && (
                <tr className="row-section">
                  <td colSpan={COLUMNS.length}>
                    <button type="button" className="section-toggle" aria-expanded={open} onClick={() => onToggle(group.key)}>
                      <Icon name="chevronRight" size={14} strokeWidth={3} />
                      <span>
                        <span className="clause-code">{group.section.clause}</span>
                        {group.section.isoClause !== group.section.clause && group.section.isoClause}
                      </span>
                      <span className="section-toggle__count">{plural(group.questionCount, "question")}</span>
                    </button>
                  </td>
                </tr>
              )}
              {open && group.rows.map((row) =>
                row.type === "subsection" ? (
                  <tr key={row.dbId} className="row-subsection">
                    <td colSpan={COLUMNS.length}>
                      <span className="clause-code">{row.clause}</span>
                      {row.isoClause !== row.clause && row.isoClause}
                    </td>
                  </tr>
                ) : (
                  <tr key={row.dbId}>
                    <td>
                      <div className="cell-id">
                        <Link to={clausePath(standard, row)} title="Open clause details">
                          <Tag>{row.clause}</Tag>
                        </Link>
                        {canDelete && (
                          <IconButton icon="trash" size={13} label={`Delete clause ${row.clause}`} onClick={() => removeRow(row, `clause ${row.clause}`)} />
                        )}
                      </div>
                    </td>
                    <td>
                      <InlineEdit value={row.isoClause} onSave={saveField(row, "isoClause")} canEdit={canEdit} label="requirement" rows={5}
                        renderValue={(v) => <FormattedText text={v} />} />
                    </td>
                    <td>
                      <InlineEdit value={row.auditQuestion} onSave={saveField(row, "auditQuestion")} canEdit={canEdit} label="audit question" rows={4}
                        renderValue={(v) => <FormattedText text={v} />} />
                    </td>
                    <td>
                      <InlineEdit value={row.std} onSave={saveField(row, "std")} canEdit={canEdit} label="std" rows={1}
                        renderValue={(v) => <TagList value={v} />} />
                    </td>
                    <td>
                      <InlineEdit value={row.cycle} onSave={saveField(row, "cycle")} canEdit={canEdit} label="cycle" rows={1} />
                    </td>
                    <td>
                      <EvidenceCell clauseId={row.dbId} notes={row.evaluatorNotes} onSaveNotes={saveField(row, "evaluatorNotes")}
                        files={files} canEdit={canEdit} />
                    </td>
                    <td>
                      <InlineEdit value={row.responsibleParty} onSave={saveField(row, "responsibleParty")} canEdit={canEdit} label="responsible party" rows={2} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
