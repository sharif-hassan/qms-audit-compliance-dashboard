const express = require("express");
const path = require("path");
const prisma = require("../prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logChange } = require("../utils/changelog");

const router = express.Router();

const ANY_ROLE = requireRole("ADMIN", "USER", "GUEST");
const EDITORS  = requireRole("ADMIN", "USER");
const ADMINS   = requireRole("ADMIN");

// Every clause read requires a logged-in user.
router.use(requireAuth);

// ── Helpers ───────────────────────────────────────────────────────

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Linked files grouped by their per-clause comment. Falls back to the legacy
// evidence JSON stored on the clause itself.
function evidenceFor(clause) {
  const groups = {};
  for (const fc of clause.files || []) {
    const key = fc.comment || "";
    if (!groups[key]) groups[key] = { comment: key, files: [] };
    groups[key].files.push({
      name: fc.file.name,
      url:  `/uploads/${path.basename(fc.file.storagePath)}`,
    });
  }
  const grouped = Object.values(groups);
  return grouped.length > 0 ? grouped : parseJsonArray(clause.evidenceJson);
}

const withFiles = { files: { include: { file: true } } };

function isNotFound(err) {
  return err?.code === "P2025";
}

// ── All clauses (used by the Files page) ──────────────────────────

router.get("/", ANY_ROLE, async (req, res) => {
  const clauses = await prisma.clause.findMany({ orderBy: { code: "asc" } });
  res.json(clauses);
});

router.post("/", ADMINS, async (req, res) => {
  const { code, title } = req.body || {};
  if (!code) return res.status(400).json({ error: "Missing code" });

  const created = await prisma.clause.upsert({
    where: { code },
    update: { title: title ?? undefined },
    create: { code, title: title ?? null },
  });

  res.status(201).json(created);
});

// ── ISO 9001 and ISO 42001 ────────────────────────────────────────
// Both are hierarchical checklists (section → subsection → question) with the
// same columns, so they share one set of handlers.

const HIERARCHICAL_FIELDS = [
  "isoClause", "auditQuestion", "std", "cycle", "responsibleParty", "evidence", "evaluatorNotes",
];

function registerHierarchicalStandard(standard, label) {
  const prefix = `${standard}_`;

  router.get(`/${standard}`, ANY_ROLE, async (req, res) => {
    const clauses = await prisma.clause.findMany({
      where: { standard },
      include: withFiles,
      orderBy: { id: "asc" },
    });

    res.json(clauses.map((c) => ({
      dbId:             c.id,
      clause:           c.code.slice(prefix.length),
      type:             c.type,
      isoClause:        c.isoClause,
      auditQuestion:    c.auditQuestion,
      std:              c.std,
      cycle:            c.cycle,
      responsibleParty: c.responsibleParty,
      evaluatorNotes:   c.evaluatorNotes,
      evidence:         evidenceFor(c),
    })));
  });

  router.patch(`/${standard}/:code`, EDITORS, async (req, res) => {
    const { field, value } = req.body || {};
    if (!HIERARCHICAL_FIELDS.includes(field)) {
      return res.status(400).json({ error: "Invalid field" });
    }

    const data = field === "evidence"
      ? { evidenceJson: JSON.stringify(value) }
      : { [field]: value };

    try {
      await prisma.clause.update({ where: { code: prefix + req.params.code }, data });
    } catch (err) {
      if (isNotFound(err)) return res.status(404).json({ error: "Clause not found" });
      throw err;
    }

    await logChange("CLAUSE_UPDATED", `${label} ${req.params.code}: updated ${field}`, req.auth);
    res.json({ success: true });
  });

  router.delete(`/${standard}/:code`, ADMINS, async (req, res) => {
    try {
      await prisma.clause.delete({ where: { code: prefix + req.params.code } });
    } catch (err) {
      if (isNotFound(err)) return res.status(404).json({ error: "Clause not found" });
      throw err;
    }

    await logChange("CLAUSE_DELETED", `${label} ${req.params.code} was deleted`, req.auth);
    res.json({ ok: true });
  });
}

registerHierarchicalStandard("iso9001", "ISO 9001");
registerHierarchicalStandard("iso42001", "ISO 42001");

// ── ISO 27001 ─────────────────────────────────────────────────────
// Flat list of Annex A controls. The control id ("Annex A 5.1") is stored in
// the code with spaces replaced by underscores.

const ISO27001_FIELDS = {
  category:       "category",
  title:          "title",
  description:    "description",
  reference:      "reference",
  evaluatorNotes: "evaluatorNotes",
  responsible:    "responsibleParty",
};

const iso27001Code = (id) => `iso27001_${id.replace(/ /g, "_")}`;

router.get("/iso27001", ANY_ROLE, async (req, res) => {
  const clauses = await prisma.clause.findMany({
    where: { standard: "iso27001" },
    include: withFiles,
    orderBy: { id: "asc" },
  });

  res.json(clauses.map((c) => ({
    dbId:           c.id,
    id:             c.code.replace("iso27001_", "").replace(/_/g, " "),
    category:       c.category,
    title:          c.title,
    description:    c.description,
    reference:      c.reference,
    evaluatorNotes: c.evaluatorNotes,
    responsible:    c.responsibleParty,
    evidence:       evidenceFor(c),
  })));
});

router.patch("/iso27001/:id", EDITORS, async (req, res) => {
  const { field, value } = req.body || {};
  if (field !== "evidence" && !Object.hasOwn(ISO27001_FIELDS, field)) {
    return res.status(400).json({ error: "Invalid field" });
  }

  const data = field === "evidence"
    ? { evidenceJson: JSON.stringify(value) }
    : { [ISO27001_FIELDS[field]]: value };

  try {
    await prisma.clause.update({ where: { code: iso27001Code(req.params.id) }, data });
  } catch (err) {
    if (isNotFound(err)) return res.status(404).json({ error: "Control not found" });
    throw err;
  }

  await logChange("CLAUSE_UPDATED", `ISO 27001 ${req.params.id}: updated ${field}`, req.auth);
  res.json({ success: true });
});

router.delete("/iso27001/:id", ADMINS, async (req, res) => {
  try {
    await prisma.clause.delete({ where: { code: iso27001Code(req.params.id) } });
  } catch (err) {
    if (isNotFound(err)) return res.status(404).json({ error: "Control not found" });
    throw err;
  }

  await logChange("CLAUSE_DELETED", `ISO 27001 ${req.params.id} was deleted`, req.auth);
  res.json({ ok: true });
});

// ── Custom standards ──────────────────────────────────────────────
// Rows live in the same Clause table under standard "custom_<slug>". The
// standard's display name is stored in each row's description column.

const CUSTOM_FIELDS = ["isoClause", "auditQuestion", "std", "cycle", "responsibleParty", "evaluatorNotes", "evidence"];

function toSlug(name) {
  return String(name).toLowerCase().trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "");
}

function parseRowId(raw) {
  const id = Number.parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

// Older versions stored evidence JSON in evaluatorNotes for custom rows.
function splitLegacyNotes(clause) {
  const notes = clause.evaluatorNotes;
  if (notes && notes.trim().startsWith("[")) {
    const legacy = parseJsonArray(notes);
    return { notes: legacy.map((g) => g.comment).filter(Boolean).join("\n"), legacyEvidence: legacy };
  }
  return { notes, legacyEvidence: [] };
}

router.get("/custom", ANY_ROLE, async (req, res) => {
  const found = await prisma.clause.findMany({
    where: { standard: { startsWith: "custom_" } },
    select: { standard: true, description: true },
    distinct: ["standard"],
    orderBy: { standard: "asc" },
  });

  res.json(found.map((r) => {
    const slug = r.standard.replace(/^custom_/, "");
    const name = r.description || slug.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    return { slug, name };
  }));
});

router.post("/custom", EDITORS, async (req, res) => {
  const { name, rows } = req.body || {};
  if (!name || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "Missing name or rows" });
  }

  const slug = toSlug(name);
  if (!slug) return res.status(400).json({ error: "Invalid standard name" });

  const standard = `custom_${slug}`;
  const existing = await prisma.clause.findFirst({ where: { standard } });
  if (existing) return res.status(409).json({ error: "A standard with this name already exists." });

  const displayName = name.trim();
  await prisma.clause.createMany({
    data: rows.map((r, i) => ({
      code:             `${standard}_${i}`,
      standard,
      type:             r.type || "question",
      title:            String(r.clause || ""),
      isoClause:        r.isoClause        || null,
      auditQuestion:    r.auditQuestion    || null,
      std:              r.std              || null,
      cycle:            r.cycle            || null,
      responsibleParty: r.responsibleParty || null,
      evaluatorNotes:   r.evaluatorNotes   || null,
      category:         r.category         || null,
      description:      displayName,
      reference:        r.reference        || null,
    })),
  });

  const questionCount = rows.filter((r) => (r.type || "question") === "question").length;
  await logChange(
    "STANDARD_CREATED",
    `Custom standard "${displayName}" was created (${questionCount} question${questionCount === 1 ? "" : "s"})`,
    req.auth,
  );
  res.status(201).json({ slug, name: displayName });
});

router.get("/custom/:slug", ANY_ROLE, async (req, res) => {
  const standard = `custom_${req.params.slug}`;
  const clauses = await prisma.clause.findMany({
    where: { standard },
    include: withFiles,
    orderBy: { id: "asc" },
  });

  res.json(clauses.map((c) => {
    const { notes, legacyEvidence } = splitLegacyNotes(c);
    const evidence = evidenceFor(c);
    return {
      dbId:             c.id,
      clause:           c.title || c.code.replace(`${standard}_`, ""),
      type:             c.type,
      isoClause:        c.isoClause,
      auditQuestion:    c.auditQuestion,
      std:              c.std,
      cycle:            c.cycle,
      responsibleParty: c.responsibleParty,
      evaluatorNotes:   notes,
      evidence:         evidence.length > 0 ? evidence : legacyEvidence,
    };
  }));
});

router.patch("/custom/:slug/:id", EDITORS, async (req, res) => {
  const { field, value } = req.body || {};
  if (!CUSTOM_FIELDS.includes(field)) return res.status(400).json({ error: "Invalid field" });

  const id = parseRowId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Invalid id" });

  const data = field === "evidence"
    ? { evidenceJson: JSON.stringify(value) }
    : { [field]: value };

  // updateMany lets us scope the update to this standard, so an id from a
  // different standard can't be edited through this route.
  const result = await prisma.clause.updateMany({
    where: { id, standard: `custom_${req.params.slug}` },
    data,
  });
  if (result.count === 0) return res.status(404).json({ error: "Clause not found" });

  await logChange("CLAUSE_UPDATED", `Custom standard ${req.params.slug} row ${id}: updated ${field}`, req.auth);
  res.json({ success: true });
});

router.delete("/custom/:slug", ADMINS, async (req, res) => {
  const standard = `custom_${req.params.slug}`;
  const result = await prisma.clause.deleteMany({ where: { standard } });
  if (result.count === 0) return res.status(404).json({ error: "Standard not found" });

  await logChange("STANDARD_DELETED", `Custom standard "${req.params.slug}" was deleted`, req.auth);
  res.json({ ok: true, deleted: result.count });
});

router.delete("/custom/:slug/:id", ADMINS, async (req, res) => {
  const id = parseRowId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Invalid id" });

  const result = await prisma.clause.deleteMany({
    where: { id, standard: `custom_${req.params.slug}` },
  });
  if (result.count === 0) return res.status(404).json({ error: "Clause not found" });

  await logChange("CLAUSE_DELETED", `Custom standard ${req.params.slug} row ${id} was deleted`, req.auth);
  res.json({ ok: true });
});

module.exports = router;
