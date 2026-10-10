// Describes every standard the app knows about, so pages and API calls can be
// written once and work for ISO 9001, ISO 27001, ISO 42001 and custom uploads.
//
// Two layouts exist:
//   "checklist" – hierarchical section → subsection → question rows
//                 (ISO 9001, ISO 42001 and every custom standard)
//   "controls"  – a flat list of controls (ISO 27001 Annex A)

export const BUILT_IN_STANDARDS = [
  {
    id: "iso9001",
    name: "ISO 9001",
    title: "ISO 9001:2015",
    layout: "checklist",
    icon: "grid",
    path: "/iso9001",
    eyebrow: "Quality Management System",
    subtitle: "Audit questions, evidence and responsible parties",
  },
  {
    id: "iso27001",
    name: "ISO 27001",
    title: "ISO 27001:2022",
    layout: "controls",
    icon: "shield",
    path: "/iso27001",
    eyebrow: "Information Security",
    subtitle: "Annex A controls, evaluator notes and evidence",
  },
  {
    id: "iso42001",
    name: "ISO 42001",
    title: "ISO 42001:2023",
    layout: "checklist",
    icon: "cpu",
    path: "/iso42001",
    eyebrow: "AI Management System",
    subtitle: "Audit questions, evidence and responsible parties",
  },
];

const CUSTOM_PREFIX = "custom:";

export const customStandardId = (slug) => `${CUSTOM_PREFIX}${slug}`;

export function describeStandard(id, customStandards = []) {
  const builtIn = BUILT_IN_STANDARDS.find((s) => s.id === id);
  if (builtIn) return builtIn;
  if (!id?.startsWith(CUSTOM_PREFIX)) return null;

  const slug = id.slice(CUSTOM_PREFIX.length);
  const name = customStandards.find((s) => s.slug === slug)?.name
    ?? slug.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  return {
    id,
    slug,
    name,
    title: name,
    layout: "checklist",
    icon: "layers",
    path: `/custom/${slug}`,
    eyebrow: "Custom Standard",
    subtitle: "Imported audit checklist",
    isCustom: true,
  };
}

export function allStandards(customStandards = []) {
  return [
    ...BUILT_IN_STANDARDS,
    ...customStandards.map((s) => describeStandard(customStandardId(s.slug), customStandards)),
  ];
}

export function rowsEndpoint(standard) {
  return standard.isCustom ? `/api/clauses/custom/${standard.slug}` : `/api/clauses/${standard.id}`;
}

export function rowEndpoint(standard, row) {
  if (standard.isCustom) return `/api/clauses/custom/${standard.slug}/${row.dbId}`;
  return `/api/clauses/${standard.id}/${encodeURIComponent(rowLabel(standard, row))}`;
}

// The human-readable clause number ("4.1 q1", "Annex A 5.1", "ID.AM-1").
export function rowLabel(standard, row) {
  return standard.layout === "controls" ? row.id : row.clause;
}

export function clausePath(standard, row) {
  return `${standard.path}/clause/${row.dbId}`;
}

export const isQuestion = (row) => row.type === "question" || row.type === undefined;

// ── Raw clause rows from /api/clauses or /api/files ─────────────────

export function standardIdFromDb(dbStandard) {
  return dbStandard?.startsWith("custom_") ? customStandardId(dbStandard.slice(7)) : dbStandard;
}

export function rawClauseLabel(clause) {
  if (clause.standard === "iso27001") return clause.code.replace("iso27001_", "").replace(/_/g, " ");
  if (clause.standard?.startsWith("custom_")) return clause.title || clause.code;
  return clause.code.replace(`${clause.standard}_`, "");
}

export function rawClauseText(clause) {
  if (clause.standard === "iso27001") return clause.title || "";
  return clause.isoClause || clause.auditQuestion || "";
}
