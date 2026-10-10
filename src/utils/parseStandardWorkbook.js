// Turns an uploaded audit spreadsheet into checklist rows:
//   { type: "section" | "subsection" | "question", clause, isoClause, auditQuestion,
//     std, cycle, responsibleParty, evaluatorNotes }
//
// Columns are matched by header name, not position, and any metadata rows
// above the header are skipped. Three layouts are recognised:
//   "iso27001" – flat list with Standard / Control / Description columns
//   "typed"    – hierarchical with an explicit Type column
//   "iso9001"  – hierarchical, row type inferred from the clause number
//   "generic"  – anything else, inferred the same way as iso9001

const HEADER_KEYWORDS = [
  "standard", "clause", "control", "iso", "audit", "evidence",
  "responsible", "type", "description", "evaluator", "reference", "cycle", "std",
];

// The header is the first of the first 12 rows that mentions 2+ keywords.
export function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(12, rows.length); i++) {
    const cells = rows[i].map((c) => String(c).toLowerCase().trim());
    const hits = cells.filter((c) => HEADER_KEYWORDS.some((kw) => c.includes(kw)));
    if (hits.length >= 2) return i;
  }
  return 0;
}

// Maps field names to column indexes. The order of checks matters for
// ambiguous names (e.g. "ISO Clause" before "Clause").
export function buildColumnMap(headerRow) {
  const map = {};
  let descriptionCount = 0;

  headerRow.forEach((raw, i) => {
    const h = String(raw).toLowerCase().trim();

    if (h === "type") map.type = i;
    else if (h.includes("iso clause") || h.includes("iso_clause") || h === "requirement") map.isoClause = i;
    else if (h.includes("audit question") || h.includes("audit_question")) map.auditQuestion = i;
    else if (h.includes("evaluator")) map.evidence = i;
    else if (h.includes("responsible")) map.responsibleParty = i;
    else if (h === "reference") map.reference = i;
    else if (h === "cycle") map.cycle = i;
    else if (h === "std") map.std = i;
    else if (h === "evidence" && map.evidence === undefined) map.evidence = i;
    else if (h === "control") map.control = i;
    else if (h === "standard" && map.clause === undefined) map.clause = i;
    else if (h === "clause" || h.startsWith("clause ") || h.startsWith("clause n")) {
      // "Clause No." + "Clause": the first is the number, the second the requirement text.
      if (map.clause === undefined) map.clause = i;
      else if (map.isoClause === undefined) map.isoClause = i;
    }
    else if (h === "description" || h.endsWith("description")) {
      // First Description column is the short title, the second the full text.
      descriptionCount++;
      if (descriptionCount === 1) map.title = i;
      else if (descriptionCount === 2) map.description = i;
    }
    // Anything else (Score, Scoring Explanation, …) is ignored.
  });

  return map;
}

export function detectFormat(colMap) {
  if (colMap.control !== undefined && colMap.title !== undefined && colMap.isoClause === undefined) return "iso27001";
  if (colMap.type !== undefined) return "typed";
  if (colMap.isoClause !== undefined || colMap.auditQuestion !== undefined) return "iso9001";
  return "generic";
}

// "4" → section, "4.1" / "4.1.2" → subsection, anything else → question.
export function inferRowType(clause) {
  const s = String(clause).trim();
  if (/^\d+$/.test(s)) return "section";
  if (/^\d+\.\d+(\.\d+)*$/.test(s)) return "subsection";
  return "question";
}

const DETAIL_FIELDS = ["auditQuestion", "description", "std", "cycle", "evidence", "responsibleParty"];

function isHeadingRow(row, colMap) {
  return DETAIL_FIELDS.every((field) => get(row, colMap, field) === "");
}

const get = (row, colMap, field) =>
  colMap[field] === undefined ? "" : String(row[colMap[field]] ?? "").trim();

function question(fields) {
  return {
    type: "question",
    clause: fields.clause,
    isoClause: fields.isoClause,
    auditQuestion: fields.auditQuestion,
    std: fields.std ?? "",
    cycle: fields.cycle ?? "",
    responsibleParty: fields.responsibleParty,
    evaluatorNotes: fields.evaluatorNotes,
  };
}

// `raw` is an array of row arrays, e.g. from XLSX.utils.sheet_to_json(sheet, { header: 1 }).
export function parseStandardRows(raw) {
  if (raw.length < 2) return { rows: [], format: "unknown" };

  const headerIdx = findHeaderRow(raw);
  const colMap = buildColumnMap(raw[headerIdx]);
  const format = detectFormat(colMap);
  const dataRows = raw
    .slice(headerIdx + 1)
    .filter((row) => row.some((cell) => cell !== "" && cell != null));

  const rows = [];

  if (format === "iso27001") {
    // Flat list: insert a section header whenever the Control category changes.
    let lastControl = null;
    for (const row of dataRows) {
      const clause = get(row, colMap, "clause");
      if (!clause) continue;
      const control = get(row, colMap, "control");
      if (control && control !== lastControl) {
        rows.push({ type: "section", clause: control, isoClause: control });
        lastControl = control;
      }
      rows.push(question({
        clause,
        isoClause: get(row, colMap, "title"),
        auditQuestion: get(row, colMap, "description"),
        responsibleParty: get(row, colMap, "responsibleParty"),
        evaluatorNotes: get(row, colMap, "evidence"),
      }));
    }
    return { rows, format };
  }

  for (const row of dataRows) {
    const clause = get(row, colMap, "clause");
    const isoClause = get(row, colMap, "isoClause") || get(row, colMap, "title");

    let type;
    if (format === "typed") {
      const declared = get(row, colMap, "type").toLowerCase();
      if (["header", "section", "subsection"].includes(declared)) {
        type = /^\d+\.\d+/.test(clause) ? "subsection" : "section";
      } else if (declared === "question") {
        type = "question";
      } else {
        continue;
      }
    } else {
      type = inferRowType(clause);
      // Non-numeric outlines ("ID" → "ID.AM" → "ID.AM-1") can't be read from
      // the clause number alone. A row with a title but no question or other
      // details is a heading: top level if it has no separator, else a sub-heading.
      if (type === "question" && clause && isHeadingRow(row, colMap)) {
        type = /[.\-\s]/.test(clause) ? "subsection" : "section";
      }
    }

    if (type !== "question") {
      rows.push({ type, clause: clause || "Section", isoClause });
      continue;
    }

    rows.push(question({
      clause,
      isoClause,
      auditQuestion: get(row, colMap, "auditQuestion") || get(row, colMap, "description"),
      std: get(row, colMap, "std"),
      cycle: get(row, colMap, "cycle"),
      responsibleParty: get(row, colMap, "responsibleParty"),
      evaluatorNotes: get(row, colMap, "evidence"),
    }));
  }

  return { rows, format };
}
