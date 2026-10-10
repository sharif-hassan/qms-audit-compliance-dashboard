const request = require("supertest");
const app = require("../app");
const prisma = require("../prisma");
const { api } = require("./helpers");

jest.mock("../prisma");

describe("authentication is required for data routes", () => {
  it.each([
    "/api/clauses",
    "/api/clauses/iso9001",
    "/api/clauses/iso27001",
    "/api/clauses/iso42001",
    "/api/clauses/custom",
    "/api/files",
    "/api/changelog",
  ])("GET %s returns 401 without a token", async (url) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(401);
  });
});

describe("role checks", () => {
  it("lets a GUEST read clauses", async () => {
    prisma.clause.findMany.mockResolvedValue([]);
    const res = await api("GUEST").get("/api/clauses/iso9001");
    expect(res.status).toBe(200);
  });

  it("stops a GUEST from editing clauses", async () => {
    const res = await api("GUEST")
      .patch("/api/clauses/iso9001/4.1 q1")
      .send({ field: "cycle", value: "Annual" });
    expect(res.status).toBe(403);
    expect(prisma.clause.update).not.toHaveBeenCalled();
  });

  it("lets a USER create a custom standard", async () => {
    prisma.clause.findFirst.mockResolvedValue(null);
    prisma.clause.createMany.mockResolvedValue({ count: 1 });
    const res = await api("USER")
      .post("/api/clauses/custom")
      .send({ name: "NIST CSF", rows: [{ clause: "ID.AM-1", type: "question" }] });
    expect(res.status).toBe(201);
  });

  it("stops a USER from deleting clauses", async () => {
    const res = await api("USER").delete("/api/clauses/custom/nist_csf/5");
    expect(res.status).toBe(403);
  });
});

describe("custom standard rows are scoped to their standard", () => {
  it("returns 404 when the row id belongs to a different standard", async () => {
    prisma.clause.updateMany.mockResolvedValue({ count: 0 });
    const res = await api()
      .patch("/api/clauses/custom/nist_csf/1")
      .send({ field: "cycle", value: "Annual" });

    expect(res.status).toBe(404);
    expect(prisma.clause.updateMany).toHaveBeenCalledWith({
      where: { id: 1, standard: "custom_nist_csf" },
      data: { cycle: "Annual" },
    });
  });

  it("allows editing evaluator notes on custom rows", async () => {
    prisma.clause.updateMany.mockResolvedValue({ count: 1 });
    const res = await api()
      .patch("/api/clauses/custom/nist_csf/1")
      .send({ field: "evaluatorNotes", value: "Reviewed" });
    expect(res.status).toBe(200);
  });
});

describe("evidence links", () => {
  it("builds file URLs from the stored file name, not the absolute path", async () => {
    prisma.clause.findMany.mockResolvedValue([{
      id: 1,
      code: "iso9001_4.1 q1",
      type: "question",
      files: [{ comment: "Policy", file: { name: "policy.pdf", storagePath: "/srv/app/uploads/123__policy.pdf" } }],
    }]);

    const res = await api().get("/api/clauses/iso9001");

    expect(res.body[0].evidence[0].files[0].url).toBe("/uploads/123__policy.pdf");
  });
});

describe("change log", () => {
  it("is readable by admins", async () => {
    prisma.changeLog.findMany.mockResolvedValue([{ id: 1, action: "FILE_UPLOADED" }]);
    const res = await api("ADMIN").get("/api/changelog");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("is hidden from non-admins", async () => {
    const res = await api("USER").get("/api/changelog");
    expect(res.status).toBe(403);
  });

  it("cannot be written to from the client", async () => {
    const res = await api("ADMIN").post("/api/changelog").send({ action: "FAKE", description: "x" });
    expect(res.status).toBe(404);
  });

  it("records who made a clause edit", async () => {
    prisma.clause.update.mockResolvedValue({ id: 1 });
    await api("USER").patch("/api/clauses/iso42001/5.1 q1").send({ field: "cycle", value: "Annual" });

    expect(prisma.changeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "CLAUSE_UPDATED", performedBy: "user@example.com" }),
    });
  });
});

describe("user management safety", () => {
  it("prevents an admin from deleting their own account", async () => {
    const res = await api("ADMIN").delete("/api/users/1");
    expect(res.status).toBe(400);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it("prevents an admin from removing their own admin role", async () => {
    const res = await api("ADMIN").patch("/api/users/1").send({ role: "USER" });
    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("change log descriptions", () => {
  const { describeClause } = require("../utils/changelog");

  it("names clauses the way people read them", () => {
    expect(describeClause({ standard: "iso27001", code: "iso27001_Annex_A_5.1" })).toBe("ISO 27001 Annex A 5.1");
    expect(describeClause({ standard: "iso9001", code: "iso9001_4.1 q1" })).toBe("ISO 9001 4.1 q1");
    expect(describeClause({ standard: "custom_nist_csf", code: "custom_nist_csf_2", title: "ID.AM-1", description: "NIST CSF" }))
      .toBe("NIST CSF ID.AM-1");
  });
});

describe("standard creation log entry", () => {
  it("counts questions, not section headings", async () => {
    prisma.clause.findFirst.mockResolvedValue(null);
    prisma.clause.createMany.mockResolvedValue({ count: 3 });
    await api("ADMIN").post("/api/clauses/custom").send({
      name: "Mini",
      rows: [{ type: "section", clause: "A" }, { type: "question", clause: "A1" }, { type: "question", clause: "A2" }],
    });
    expect(prisma.changeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "STANDARD_CREATED", description: 'Custom standard "Mini" was created (2 questions)' }),
    });
  });
});
