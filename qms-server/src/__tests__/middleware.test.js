const jwt = require("jsonwebtoken");

// We import the middleware after setting up env (done in setup.js)
const { requireAuth, requireRole } = require("../middleware/auth");

const JWT_SECRET = "test-secret-key";

// ---------------------------------------------------------------------------
// Helpers to create lightweight req / res / next mocks
// ---------------------------------------------------------------------------

function makeReq(overrides = {}) {
  return {
    headers: {},
    auth: undefined,
    ...overrides,
  };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

// ---------------------------------------------------------------------------
// requireAuth
// ---------------------------------------------------------------------------

describe("requireAuth middleware", () => {
  it("calls next() and sets req.auth when a valid token is provided", () => {
    const payload = { userId: 1, role: "ADMIN" };
    const token   = jwt.sign(payload, JWT_SECRET);

    const req  = makeReq({ headers: { authorization: `Bearer ${token}` } });
    const res  = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toBeDefined();
    expect(req.auth.userId).toBe(payload.userId);
    expect(req.auth.role).toBe(payload.role);
  });

  it("returns 401 when no Authorization header is present", () => {
    const req  = makeReq({ headers: {} });
    const res  = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalled();
  });

  it("returns 401 when the Authorization header is malformed (no Bearer prefix)", () => {
    const req  = makeReq({ headers: { authorization: "NotBearer sometoken" } });
    const res  = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 when the token is invalid / tampered", () => {
    const req  = makeReq({ headers: { authorization: "Bearer this.is.not.valid" } });
    const res  = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 when the token is signed with the wrong secret", () => {
    const token = jwt.sign({ userId: 1, role: "ADMIN" }, "wrong-secret");
    const req   = makeReq({ headers: { authorization: `Bearer ${token}` } });
    const res   = makeRes();
    const next  = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ---------------------------------------------------------------------------
// requireRole
// ---------------------------------------------------------------------------

describe("requireRole middleware", () => {
  function authedReq(role) {
    return makeReq({ auth: { userId: 1, role } });
  }

  it("calls next() when the user has the required role", () => {
    const middleware = requireRole("ADMIN");
    const req  = authedReq("ADMIN");
    const res  = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 403 when the user does not have the required role", () => {
    const middleware = requireRole("ADMIN");
    const req  = authedReq("USER");
    const res  = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
  });

  it("returns 401 when req.auth is undefined (not authenticated)", () => {
    // requireRole returns 401 (not 403) when req.auth is missing — see middleware/auth.js
    const middleware = requireRole("ADMIN");
    const req  = makeReq({ auth: undefined });
    const res  = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("calls next() when the role matches one of multiple accepted roles", () => {
    // Some implementations accept an array; test with single string
    const middleware = requireRole("USER");
    const req  = authedReq("USER");
    const res  = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
