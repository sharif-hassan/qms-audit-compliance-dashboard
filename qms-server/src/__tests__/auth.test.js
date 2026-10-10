const request = require("supertest");
const app = require("../app");
const prisma = require("../prisma");
const bcrypt = require("bcrypt");

jest.mock("../prisma");
jest.mock("bcrypt");

describe("POST /auth/login", () => {
  const validUser = {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
    passwordHash: "$2b$10$hashedpassword",
    role: "ADMIN",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 with a token when credentials are valid", async () => {
    prisma.user.findUnique.mockResolvedValue(validUser);
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toMatchObject({
      id: validUser.id,
      name: validUser.name,
      email: validUser.email,
      role: validUser.role,
    });
  });

  it("returns 401 when the user is not found", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "any-password" });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toBeDefined();
  });

  it("returns 401 when the password is wrong", async () => {
    prisma.user.findUnique.mockResolvedValue(validUser);
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toBeDefined();
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ password: "some-password" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "alice@example.com" });

    expect(res.status).toBe(400);
  });
});
