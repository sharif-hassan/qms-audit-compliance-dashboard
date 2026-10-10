const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const prisma = require("../prisma");
const bcrypt = require("bcrypt");

jest.mock("../prisma");
jest.mock("bcrypt");

const JWT_SECRET = "test-secret-key";

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

function makeToken(role = "ADMIN", userId = 1) {
  return jwt.sign({ userId, role }, JWT_SECRET);
}

const adminToken = makeToken("ADMIN");
const userToken  = makeToken("USER", 2);

// ---------------------------------------------------------------------------
// Mock users
// ---------------------------------------------------------------------------

const mockUsers = [
  { id: 1, name: "Alice", email: "alice@example.com", role: "ADMIN" },
  { id: 2, name: "Bob",   email: "bob@example.com",   role: "USER" },
];

// ---------------------------------------------------------------------------
// GET /api/users
// ---------------------------------------------------------------------------

describe("GET /api/users", () => {
  beforeEach(() => {
    prisma.user.findMany.mockResolvedValue(mockUsers);
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });

  it("returns 403 when the token belongs to a USER role", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 200 with users array for ADMIN token", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    // Route returns { ok: true, users: [...] }
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBe(mockUsers.length);
  });
});

// ---------------------------------------------------------------------------
// POST /api/users
// ---------------------------------------------------------------------------

describe("POST /api/users", () => {
  beforeEach(() => {
    bcrypt.hash.mockResolvedValue("hashed_password");
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "new@example.com" }); // missing name and password

    expect(res.status).toBe(400);
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "New User", password: "pass123" });

    expect(res.status).toBe(400);
  });

  it("creates a user and returns 201 with the new user for ADMIN", async () => {
    prisma.user.create.mockResolvedValue({
      id: 3,
      name: "New User",
      email: "new@example.com",
      role: "USER",
      createdAt: new Date().toISOString(),
    });

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "New User", email: "new@example.com", password: "pass123", role: "USER" });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it("returns 400 when email already exists (P2002)", async () => {
    // Route maps P2002 → 400, not 409
    const duplicateError = Object.assign(new Error("Duplicate"), { code: "P2002" });
    prisma.user.create.mockRejectedValue(duplicateError);
    bcrypt.hash.mockResolvedValue("hashed_password");

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Alice Again", email: "alice@example.com", password: "pass123" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "New User", email: "new@example.com", password: "pass123" });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/users/:id
// ---------------------------------------------------------------------------

describe("PATCH /api/users/:id", () => {
  it("returns 200 and updated user on success", async () => {
    prisma.user.update.mockResolvedValue({
      id: 2,
      name: "Bob Updated",
      email: "bob@example.com",
      role: "USER",
    });

    const res = await request(app)
      .patch("/api/users/2")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Bob Updated" });

    expect(res.status).toBe(200);
  });

  it("returns 404 when the user is not found (P2025)", async () => {
    const notFoundError = Object.assign(new Error("Not found"), { code: "P2025" });
    prisma.user.update.mockRejectedValue(notFoundError);

    const res = await request(app)
      .patch("/api/users/9999")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Nobody" });

    expect(res.status).toBe(404);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app)
      .patch("/api/users/1")
      .send({ name: "Hacker" });

    expect(res.status).toBe(401);
  });

  it("returns 403 with a USER token", async () => {
    const res = await request(app)
      .patch("/api/users/2")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Self Update" });

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/users/:id
// ---------------------------------------------------------------------------

describe("DELETE /api/users/:id", () => {
  it("returns 200 on successful deletion", async () => {
    prisma.user.delete.mockResolvedValue({ id: 2 });

    const res = await request(app)
      .delete("/api/users/2")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it("returns 404 when the user is not found (P2025)", async () => {
    const notFoundError = Object.assign(new Error("Not found"), { code: "P2025" });
    prisma.user.delete.mockRejectedValue(notFoundError);

    const res = await request(app)
      .delete("/api/users/9999")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).delete("/api/users/1");
    expect(res.status).toBe(401);
  });

  it("returns 403 with a USER token", async () => {
    const res = await request(app)
      .delete("/api/users/2")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});
