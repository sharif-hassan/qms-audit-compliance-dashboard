import { describe, expect, it } from "vitest";
import { buildColumnMap, detectFormat, inferRowType, parseStandardRows } from "../utils/parseStandardWorkbook";

describe("inferRowType", () => {
  it.each([
    ["4", "section"],
    ["4.1", "subsection"],
    ["4.1.2", "subsection"],
    ["4.1 q1", "question"],
    ["Annex A 5.1", "question"],
  ])("%s → %s", (clause, type) => {
    expect(inferRowType(clause)).toBe(type);
  });
});

describe("buildColumnMap", () => {
  it("maps 'Clause No.' to the clause and a following 'Clause' column to the requirement", () => {
    const map = buildColumnMap(["Clause No.", "Clause", "Audit Question", "Std", "Cycle", "Evidence", "Responsible Party"]);
    expect(map).toMatchObject({ clause: 0, isoClause: 1, auditQuestion: 2, std: 3, cycle: 4, evidence: 5, responsibleParty: 6 });
  });

  it("maps the two Description columns of the ISO 27001 layout to title and description", () => {
    const map = buildColumnMap(["Standard", "Control", "Description", "Description", "Reference", "Evaluator Notes", "Responsible"]);
    expect(map).toMatchObject({ clause: 0, control: 1, title: 2, description: 3, reference: 4, evidence: 5 });
    expect(detectFormat(map)).toBe("iso27001");
  });
});

describe("parseStandardRows", () => {
  it("skips metadata rows above the header", () => {
    const { rows } = parseStandardRows([
      ["Acme Corp audit workbook"],
      ["Prepared 2026"],
      ["Clause No.", "ISO Clause", "Audit Question"],
      ["4.1 q1", "Determine issues", "What issues exist?"],
    ]);
    expect(rows).toEqual([expect.objectContaining({ type: "question", clause: "4.1 q1", auditQuestion: "What issues exist?" })]);
  });

  it("builds a hierarchy from numeric clause numbers", () => {
    const { rows, format } = parseStandardRows([
      ["Clause No.", "ISO Clause", "Audit Question", "Evidence"],
      ["4", "Context", "", ""],
      ["4.1", "Understanding the org", "", ""],
      ["4.1 q1", "Determine issues", "What issues exist?", "Policy v2"],
    ]);
    expect(format).toBe("iso9001");
    expect(rows.map((r) => r.type)).toEqual(["section", "subsection", "question"]);
    expect(rows[2].evaluatorNotes).toBe("Policy v2");
  });

  it("treats title-only rows in non-numeric outlines as headings", () => {
    const { rows } = parseStandardRows([
      ["Clause No.", "Clause", "Audit Question", "Responsible Party"],
      ["ID", "IDENTIFY", "", ""],
      ["ID.AM", "Asset Management", "", ""],
      ["ID.AM-1", "Asset Inventory", "Are devices inventoried?", "IT Director"],
    ]);
    expect(rows).toEqual([
      { type: "section", clause: "ID", isoClause: "IDENTIFY" },
      { type: "subsection", clause: "ID.AM", isoClause: "Asset Management" },
      expect.objectContaining({ type: "question", clause: "ID.AM-1", isoClause: "Asset Inventory" }),
    ]);
  });

  it("groups the flat ISO 27001 layout into sections by Control", () => {
    const { rows, format } = parseStandardRows([
      ["Standard", "Control", "Description", "Description", "Evaluator Notes", "Responsible"],
      ["Annex A 5.1", "Organizational", "Policies", "Must have a policy", "Audited", "Compliance"],
      ["Annex A 5.2", "Organizational", "Roles", "Defined roles", "", "VP"],
      ["Annex A 6.1", "People", "Screening", "Background checks", "", "HR"],
    ]);
    expect(format).toBe("iso27001");
    expect(rows.map((r) => `${r.type}:${r.clause}`)).toEqual([
      "section:Organizational", "question:Annex A 5.1", "question:Annex A 5.2", "section:People", "question:Annex A 6.1",
    ]);
    expect(rows[1]).toMatchObject({ isoClause: "Policies", auditQuestion: "Must have a policy", evaluatorNotes: "Audited" });
  });

  it("honours an explicit Type column", () => {
    const { rows, format } = parseStandardRows([
      ["Type", "Clause", "ISO Clause", "Audit Question"],
      ["header", "5", "Leadership", ""],
      ["header", "5.1", "Commitment", ""],
      ["question", "5.1 q1", "Top management shall…", "How is commitment shown?"],
      ["note", "x", "ignored", ""],
    ]);
    expect(format).toBe("typed");
    expect(rows.map((r) => r.type)).toEqual(["section", "subsection", "question"]);
  });

  it("returns nothing for an empty sheet", () => {
    expect(parseStandardRows([["only a header"]]).rows).toEqual([]);
  });
});
