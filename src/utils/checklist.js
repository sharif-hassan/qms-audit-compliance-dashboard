import { matchesSearch } from "./format";

// Groups flat checklist rows under their section headers and applies a search
// filter. Subsection headers are kept only when a question under them matches.
export function groupChecklist(rows, search = "") {
  const groups = [];
  let current = null;
  let pendingSubsection = null;

  const startGroup = (section) => {
    current = { key: section ? `s-${section.dbId}` : `g-${groups.length}`, section, rows: [], questionCount: 0 };
    groups.push(current);
    pendingSubsection = null;
  };

  for (const row of rows) {
    if (row.type === "section") {
      startGroup(row);
      continue;
    }
    if (!current) startGroup(null);

    if (row.type === "subsection") {
      pendingSubsection = row;
      if (!search) current.rows.push(row);
      continue;
    }

    if (!matchesSearch(search, row.clause, row.isoClause, row.auditQuestion, row.std, row.cycle, row.responsibleParty, row.evaluatorNotes)) {
      continue;
    }
    if (search && pendingSubsection) {
      current.rows.push(pendingSubsection);
      pendingSubsection = null;
    }
    current.rows.push(row);
    current.questionCount++;
  }

  return search ? groups.filter((g) => g.questionCount > 0) : groups;
}
