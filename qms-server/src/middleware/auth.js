const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, message: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = payload; // { userId, role, email }
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };