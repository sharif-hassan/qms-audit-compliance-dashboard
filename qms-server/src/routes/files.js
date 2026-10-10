const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const prisma = require("../prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logChange, describeClause } = require("../utils/changelog");

const router = express.Router();

const ANY_ROLE = requireRole("ADMIN", "USER", "GUEST");
const EDITORS  = requireRole("ADMIN", "USER");

const uploadDir = process.env.UPLOAD_DIR || "uploads";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, "..", "..", uploadDir));
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-() ]+/g, "_");
    cb(null, `${Date.now()}__${safe}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const fileUrl = (storagePath) => `/uploads/${path.basename(storagePath)}`;

router.use(requireAuth);

router.get("/", ANY_ROLE, async (req, res) => {
  const files = await prisma.file.findMany({
    orderBy: { uploadedAt: "desc" },
    include: { clauses: { include: { clause: true } } },
  });

  res.json(files.map((f) => ({
    id:         f.id,
    name:       f.name,
    url:        fileUrl(f.storagePath),
    mimeType:   f.mimeType,
    sizeBytes:  f.sizeBytes,
    uploadedAt: f.uploadedAt,
    clauses: f.clauses.map((fc) => ({
      id:            fc.clause.id,
      code:          fc.clause.code,
      standard:      fc.clause.standard,
      title:         fc.clause.title,
      isoClause:     fc.clause.isoClause,
      auditQuestion: fc.clause.auditQuestion,
      comment:       fc.comment,
    })),
  })));
});

router.post("/", EDITORS, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Missing file" });

  const created = await prisma.file.create({
    data: {
      name:        req.file.originalname,
      storagePath: req.file.path,
      mimeType:    req.file.mimetype,
      sizeBytes:   req.file.size,
    },
  });

  await logChange("FILE_UPLOADED", `File "${created.name}" was uploaded`, req.auth);
  res.status(201).json({
    id:         created.id,
    name:       created.name,
    url:        fileUrl(created.storagePath),
    uploadedAt: created.uploadedAt,
  });
});

router.delete("/:id", EDITORS, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.file.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  // FileClause rows are removed by the ON DELETE CASCADE relation.
  await prisma.file.delete({ where: { id } });
  fs.rm(existing.storagePath, { force: true }, (err) => {
    if (err) console.error("Failed to remove uploaded file:", err.message);
  });

  await logChange("FILE_DELETED", `File "${existing.name}" was deleted`, req.auth);
  res.json({ ok: true });
});

router.post("/:id/clauses", EDITORS, async (req, res) => {
  const fileId = Number(req.params.id);
  const { clauseIds, clauseCodes, comment } = req.body || {};

  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) return res.status(404).json({ error: "File not found" });

  let clauses;
  if (Array.isArray(clauseIds) && clauseIds.length) {
    clauses = await prisma.clause.findMany({ where: { id: { in: clauseIds.map(Number) } } });
  } else if (Array.isArray(clauseCodes) && clauseCodes.length) {
    clauses = await prisma.clause.findMany({ where: { code: { in: clauseCodes } } });
  } else {
    return res.status(400).json({ error: "Provide clauseIds or clauseCodes" });
  }
  if (clauses.length === 0) return res.status(404).json({ error: "No matching clauses" });

  await prisma.fileClause.createMany({
    data: clauses.map((c) => ({ fileId, clauseId: c.id, comment: comment || null })),
    skipDuplicates: true,
  });

  const names = clauses.map(describeClause).join(", ");
  await logChange("CLAUSE_ATTACHED", `File "${file.name}" attached to ${names}`, req.auth);

  const updated = await prisma.file.findUnique({
    where: { id: fileId },
    include: { clauses: { include: { clause: true } } },
  });
  res.json({ id: updated.id, clauses: updated.clauses.map((fc) => fc.clause) });
});

router.patch("/:id/clauses/:clauseId", EDITORS, async (req, res) => {
  const fileId = Number(req.params.id);
  const clauseId = Number(req.params.clauseId);
  const { comment } = req.body || {};

  try {
    await prisma.fileClause.update({
      where: { fileId_clauseId: { fileId, clauseId } },
      data: { comment: comment || null },
    });
  } catch (err) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Link not found" });
    throw err;
  }
  res.json({ ok: true });
});

router.delete("/:id/clauses/:clauseId", EDITORS, async (req, res) => {
  const fileId = Number(req.params.id);
  const clauseId = Number(req.params.clauseId);

  let link;
  try {
    link = await prisma.fileClause.delete({
      where: { fileId_clauseId: { fileId, clauseId } },
      include: { file: true, clause: true },
    });
  } catch (err) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Link not found" });
    throw err;
  }

  await logChange("CLAUSE_DETACHED", `File "${link.file.name}" detached from ${describeClause(link.clause)}`, req.auth);
  res.json({ ok: true });
});

module.exports = router;
