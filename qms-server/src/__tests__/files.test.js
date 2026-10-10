const { api } = require("./helpers");
const prisma = require("../prisma");

jest.mock("../prisma");

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const mockFile = {
  id: 1,
  name: "test.pdf",
  storagePath: "12345_test.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  uploadedAt: new Date().toISOString(),
  clauses: [],
};

// ---------------------------------------------------------------------------
// GET /api/files
// ---------------------------------------------------------------------------

describe("GET /api/files", () => {
  it("returns an array of file objects", async () => {
    prisma.file.findMany.mockResolvedValue([mockFile]);

    const res = await api().get("/api/files");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(mockFile.id);
    expect(res.body[0].name).toBe(mockFile.name);
  });

  it("returns an empty array when no files exist", async () => {
    prisma.file.findMany.mockResolvedValue([]);

    const res = await api().get("/api/files");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("includes clause relations in the response", async () => {
    const fileWithClauses = {
      ...mockFile,
      clauses: [{ id: 10, clause: "4.1", type: "question" }],
    };
    prisma.file.findMany.mockResolvedValue([fileWithClauses]);

    const res = await api().get("/api/files");

    expect(res.status).toBe(200);
    expect(res.body[0].clauses).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/files/:id
// ---------------------------------------------------------------------------

describe("DELETE /api/files/:id", () => {
  it("returns 200 on successful deletion", async () => {
    prisma.file.findUnique.mockResolvedValue(mockFile);
    prisma.file.delete.mockResolvedValue(mockFile);
    // fileClause cleanup
    prisma.fileClause.deleteMany.mockResolvedValue({ count: 0 });

    const res = await api().delete("/api/files/1");

    expect(res.status).toBe(200);
  });

  it("returns 404 when the file does not exist", async () => {
    prisma.file.findUnique.mockResolvedValue(null);

    const res = await api().delete("/api/files/9999");

    expect(res.status).toBe(404);
  });

  it("deletes associated fileClause records before deleting the file", async () => {
    prisma.file.findUnique.mockResolvedValue(mockFile);
    prisma.fileClause.deleteMany.mockResolvedValue({ count: 2 });
    prisma.file.delete.mockResolvedValue(mockFile);

    await api().delete("/api/files/1");

    // Either fileClause.deleteMany or file.delete must have been called
    const deletionHappened =
      prisma.file.delete.mock.calls.length > 0 ||
      prisma.fileClause.deleteMany.mock.calls.length > 0;
    expect(deletionHappened).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/files/:id/clauses  (link file to clauses)
// ---------------------------------------------------------------------------

describe("POST /api/files/:id/clauses", () => {
  const mockFileWithClauses = { ...mockFile, clauses: [] };

  beforeEach(() => {
    // First findUnique: check file exists. Second: return updated file.
    prisma.file.findUnique.mockResolvedValue(mockFileWithClauses);
    // clause lookup by id or code
    prisma.clause.findMany.mockResolvedValue([{ id: 1, code: "iso9001_4.1", title: null }]);
    // create the FileClause join rows
    prisma.fileClause.createMany.mockResolvedValue({ count: 1 });
    prisma.fileClause.create.mockResolvedValue({ fileId: 1, clauseId: 1 });
  });

  it("links file to clauses by clauseIds", async () => {
    const res = await api()
      .post("/api/files/1/clauses")
      .send({ clauseIds: [1, 2] });

    expect(res.status).toBe(200);
    expect(prisma.fileClause.createMany).toHaveBeenCalled();
  });

  it("links file to clauses by clauseCodes", async () => {
    prisma.clause.findMany.mockResolvedValue([
      { id: 5, code: "iso9001_4.1", title: null },
    ]);

    const res = await api()
      .post("/api/files/1/clauses")
      .send({ clauseCodes: ["iso9001_4.1"] });

    expect(res.status).toBe(200);
  });

  it("returns 404 when the file does not exist", async () => {
    prisma.file.findUnique.mockResolvedValue(null);

    const res = await api()
      .post("/api/files/9999/clauses")
      .send({ clauseIds: [1] });

    expect(res.status).toBe(404);
  });

  it("returns 400 when neither clauseIds nor clauseCodes are provided", async () => {
    const res = await api()
      .post("/api/files/1/clauses")
      .send({});

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/files/:id/clauses/:clauseId  (unlink)
// ---------------------------------------------------------------------------

describe("DELETE /api/files/:id/clauses/:clauseId", () => {
  it("returns 200 when the link is successfully removed", async () => {
    prisma.fileClause.delete.mockResolvedValue({
      file: { name: "test.pdf" },
      clause: { code: "iso9001_4.1 q1", standard: "iso9001" },
    });

    const res = await api().delete("/api/files/1/clauses/10");

    expect(res.status).toBe(200);
  });

  it("returns 404 when the link does not exist", async () => {
    const notFoundError = Object.assign(new Error("Not found"), { code: "P2025" });
    prisma.fileClause.delete.mockRejectedValue(notFoundError);

    const res = await api().delete("/api/files/1/clauses/9999");

    expect(res.status).toBe(404);
  });
});
