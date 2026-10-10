const { api } = require("./helpers");
const prisma = require("../prisma");

jest.mock("../prisma");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal ISO 9001 clause row (DB shape, not response shape) */
const makeIso9001Row = (overrides = {}) => ({
  id: 1,
  code: "iso9001_4.1",
  standard: "iso9001",
  type: "question",
  isoClause: "Understanding the organization",
  auditQuestion: "What issues have been identified?",
  std: "9001",
  cycle: "Annual",
  responsibleParty: "QM",
  files: [],
  ...overrides,
});

/** Build a minimal ISO 27001 clause row (DB shape) */
const makeIso27001Row = (overrides = {}) => ({
  id: 1,
  code: "iso27001_Annex_A_5.1",
  standard: "iso27001",
  type: "question",
  category: "Organizational",
  title: "Information security policies",
  description: "A set of policies for information security",
  reference: "ISO/IEC 27001:2013",
  evaluatorNotes: "",
  responsibleParty: "CISO",
  files: [],
  ...overrides,
});

/** Build a minimal ISO 42001 clause row (DB shape) */
const makeIso42001Row = (overrides = {}) => ({
  id: 1,
  code: "iso42001_5.1",
  standard: "iso42001",
  type: "question",
  isoClause: "Leadership and commitment",
  auditQuestion: "How does top management demonstrate commitment?",
  std: "42001",
  cycle: "Annual",
  responsibleParty: "CEO",
  files: [],
  ...overrides,
});

/** Build a minimal custom clause row (DB shape) */
const makeCustomRow = (overrides = {}) => ({
  id: 1,
  code: "custom_my_standard_0",
  standard: "custom_my_standard",
  type: "question",
  title: "4.1",
  isoClause: "Understanding the org",
  auditQuestion: "What issues exist?",
  std: "",
  cycle: "Annual",
  responsibleParty: "VP Tech",
  evaluatorNotes: null,
  files: [],
  ...overrides,
});

// ---------------------------------------------------------------------------
// ISO 9001
// ---------------------------------------------------------------------------

describe("GET /api/clauses/iso9001", () => {
  it("returns an array of ISO 9001 clause objects", async () => {
    prisma.clause.findMany.mockResolvedValue([makeIso9001Row()]);

    const res = await api().get("/api/clauses/iso9001");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("returns an empty array when there are no clauses", async () => {
    prisma.clause.findMany.mockResolvedValue([]);

    const res = await api().get("/api/clauses/iso9001");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("PATCH /api/clauses/iso9001/:code", () => {
  it("returns { success: true } when updating an allowed field", async () => {
    prisma.clause.update.mockResolvedValue({ id: 1 });

    const res = await api()
      .patch("/api/clauses/iso9001/4.1")
      .send({ field: "auditQuestion", value: "New question?" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 when the field is not allowed", async () => {
    const res = await api()
      .patch("/api/clauses/iso9001/4.1")
      .send({ field: "passwordHash", value: "evil" });

    expect(res.status).toBe(400);
  });

  it("accepts all allowed fields without error", async () => {
    prisma.clause.update.mockResolvedValue({ id: 1 });
    const allowed = ["isoClause", "auditQuestion", "std", "cycle", "responsibleParty", "evidence"];

    for (const field of allowed) {
      const res = await api()
        .patch("/api/clauses/iso9001/4.1")
        .send({ field, value: "test value" });
      expect(res.status).toBe(200);
    }
  });
});

// ---------------------------------------------------------------------------
// ISO 27001
// ---------------------------------------------------------------------------

describe("GET /api/clauses/iso27001", () => {
  it("returns an array of ISO 27001 clause objects", async () => {
    prisma.clause.findMany.mockResolvedValue([makeIso27001Row()]);

    const res = await api().get("/api/clauses/iso27001");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("returns an empty array when there are no clauses", async () => {
    prisma.clause.findMany.mockResolvedValue([]);

    const res = await api().get("/api/clauses/iso27001");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("PATCH /api/clauses/iso27001/:id", () => {
  it("returns { success: true } when updating an allowed field", async () => {
    prisma.clause.update.mockResolvedValue({ id: 1 });

    const res = await api()
      .patch("/api/clauses/iso27001/1")
      .send({ field: "evaluatorNotes", value: "Checked and verified" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 when the field is not allowed", async () => {
    const res = await api()
      .patch("/api/clauses/iso27001/1")
      .send({ field: "__proto__", value: "evil" });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// ISO 42001
// ---------------------------------------------------------------------------

describe("GET /api/clauses/iso42001", () => {
  it("returns an array of ISO 42001 clause objects", async () => {
    prisma.clause.findMany.mockResolvedValue([makeIso42001Row()]);

    const res = await api().get("/api/clauses/iso42001");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns an empty array when there are no clauses", async () => {
    prisma.clause.findMany.mockResolvedValue([]);

    const res = await api().get("/api/clauses/iso42001");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("PATCH /api/clauses/iso42001/:code", () => {
  it("returns { success: true } when updating an allowed field", async () => {
    prisma.clause.update.mockResolvedValue({ id: 1 });

    const res = await api()
      .patch("/api/clauses/iso42001/5.1")
      .send({ field: "responsibleParty", value: "CTO" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 when the field is not allowed", async () => {
    const res = await api()
      .patch("/api/clauses/iso42001/5.1")
      .send({ field: "notAllowed", value: "bad" });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Custom standards
// ---------------------------------------------------------------------------

describe("GET /api/clauses/custom", () => {
  it("returns an array of { slug, name } objects", async () => {
    // Route uses findMany with distinct on standard, then maps to { slug, name }
    prisma.clause.findMany.mockResolvedValue([
      { standard: "custom_my_standard" },
    ]);

    const res = await api().get("/api/clauses/custom");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ slug: "my_standard" });
  });

  it("returns empty array when no custom standards exist", async () => {
    prisma.clause.findMany.mockResolvedValue([]);

    const res = await api().get("/api/clauses/custom");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("POST /api/clauses/custom", () => {
  it("creates a new custom standard and returns success", async () => {
    prisma.clause.findFirst.mockResolvedValue(null); // does not exist yet
    prisma.clause.createMany.mockResolvedValue({ count: 2 });

    const res = await api()
      .post("/api/clauses/custom")
      .send({
        name: "My Standard",
        rows: [
          { clause: "4", type: "section", isoClause: "Context" },
          { clause: "4.1", type: "question", isoClause: "Understanding the org", auditQuestion: "What issues?" },
        ],
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.slug).toBeDefined();
  });

  it("returns 409 when the standard already exists", async () => {
    prisma.clause.findFirst.mockResolvedValue({ id: 1, standard: "custom_my_standard" }); // already exists

    const res = await api()
      .post("/api/clauses/custom")
      .send({
        name: "My Standard",
        rows: [{ clause: "4", type: "section", isoClause: "Context" }],
      });

    expect(res.status).toBe(409);
  });

  it("returns 400 when name is missing", async () => {
    const res = await api()
      .post("/api/clauses/custom")
      .send({ rows: [] });

    expect(res.status).toBe(400);
  });

  it("returns 400 when rows are missing", async () => {
    const res = await api()
      .post("/api/clauses/custom")
      .send({ name: "My Standard" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/clauses/custom/:slug", () => {
  it("returns rows for a given slug", async () => {
    prisma.clause.findMany.mockResolvedValue([makeCustomRow()]);

    const res = await api().get("/api/clauses/custom/my_standard");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns an empty array when the slug has no rows", async () => {
    prisma.clause.findMany.mockResolvedValue([]);

    const res = await api().get("/api/clauses/custom/nonexistent");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("PATCH /api/clauses/custom/:slug/:id", () => {
  it("returns success when updating a valid field", async () => {
    prisma.clause.updateMany.mockResolvedValue({ count: 1 });

    const res = await api()
      .patch("/api/clauses/custom/my_standard/1")
      .send({ field: "auditQuestion", value: "Updated question?" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 when the field is not allowed", async () => {
    const res = await api()
      .patch("/api/clauses/custom/my_standard/1")
      .send({ field: "maliciousField", value: "bad" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when the id is not a valid integer", async () => {
    const res = await api()
      .patch("/api/clauses/custom/my_standard/not-a-number")
      .send({ field: "auditQuestion", value: "test" });

    expect(res.status).toBe(400);
  });
});
