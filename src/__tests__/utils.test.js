import { describe, expect, it } from "vitest";
import { groupChecklist } from "../utils/checklist";
import { initials, matchesSearch, plural, splitListItems } from "../utils/format";
import { describeStandard, rawClauseLabel, rowEndpoint } from "../standards";

const rows = [
  { dbId: 1, type: "section", clause: "4", isoClause: "Context" },
  { dbId: 2, type: "subsection", clause: "4.1", isoClause: "Understanding" },
  { dbId: 3, type: "question", clause: "4.1 q1", auditQuestion: "What issues exist?" },
  { dbId: 4, type: "question", clause: "4.1 q2", auditQuestion: "How are they monitored?" },
  { dbId: 5, type: "section", clause: "5", isoClause: "Leadership" },
  { dbId: 6, type: "question", clause: "5.1 q1", auditQuestion: "How is commitment shown?" },
];

describe("groupChecklist", () => {
  it("groups rows under their sections and counts questions", () => {
    const groups = groupChecklist(rows);
    expect(groups.map((g) => [g.section.clause, g.questionCount, g.rows.length])).toEqual([["4", 2, 3], ["5", 1, 1]]);
  });

  it("filters questions and keeps only the subsection headers that still have matches", () => {
    const groups = groupChecklist(rows, "monitored");
    expect(groups).toHaveLength(1);
    expect(groups[0].rows.map((r) => r.dbId)).toEqual([2, 4]);
  });

  it("puts rows that come before any section into an unnamed group", () => {
    const groups = groupChecklist([{ dbId: 9, type: "question", clause: "A1" }]);
    expect(groups[0]).toMatchObject({ key: "g-0", section: null, questionCount: 1 });
  });
});

describe("format helpers", () => {
  it("splits packed a) b) lists", () => {
    expect(splitListItems("The org shall: a) plan it; b) do it.")).toEqual({
      intro: "The org shall:",
      items: [{ marker: "a)", body: "plan it;" }, { marker: "b)", body: "do it." }],
    });
  });

  it("pluralises", () => {
    expect(plural(1, "file")).toBe("1 file");
    expect(plural(3, "file")).toBe("3 files");
  });

  it("builds initials", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("admin@example.com")).toBe("A");
    expect(initials("")).toBe("U");
  });

  it("matches search terms case-insensitively across fields", () => {
    expect(matchesSearch("ANNUAL", null, "annual review")).toBe(true);
    expect(matchesSearch("x", "abc")).toBe(false);
    expect(matchesSearch("", "anything")).toBe(true);
  });
});

describe("standards", () => {
  it("builds per-standard API endpoints", () => {
    const iso27001 = describeStandard("iso27001");
    const custom = describeStandard("custom:nist_csf", [{ slug: "nist_csf", name: "NIST CSF" }]);
    expect(rowEndpoint(iso27001, { id: "Annex A 5.1" })).toBe("/api/clauses/iso27001/Annex%20A%205.1");
    expect(rowEndpoint(describeStandard("iso9001"), { clause: "4.1 q1" })).toBe("/api/clauses/iso9001/4.1%20q1");
    expect(rowEndpoint(custom, { dbId: 42 })).toBe("/api/clauses/custom/nist_csf/42");
    expect(custom).toMatchObject({ name: "NIST CSF", path: "/custom/nist_csf", layout: "checklist" });
  });

  it("labels raw clauses from the database", () => {
    expect(rawClauseLabel({ standard: "iso27001", code: "iso27001_Annex_A_5.1" })).toBe("Annex A 5.1");
    expect(rawClauseLabel({ standard: "iso9001", code: "iso9001_4.1 q1" })).toBe("4.1 q1");
    expect(rawClauseLabel({ standard: "custom_nist", code: "custom_nist_3", title: "ID.AM-1" })).toBe("ID.AM-1");
  });
});
