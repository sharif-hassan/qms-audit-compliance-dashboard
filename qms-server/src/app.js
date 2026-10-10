require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const authRouter      = require("./routes/auth");
const filesRouter     = require("./routes/files");
const clausesRouter   = require("./routes/clauses");
const usersRouter     = require("./routes/users");
const changelogRouter = require("./routes/changelog");

const app = express();

// The Vite dev server proxies /api, /auth and /uploads, so in development the
// browser never makes a cross-origin request. CORS is only needed when the
// frontend is served from a different origin.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "5mb" }));

const uploadDir    = process.env.UPLOAD_DIR || "uploads";
const absUploadDir = path.join(__dirname, "..", uploadDir);
if (!fs.existsSync(absUploadDir)) fs.mkdirSync(absUploadDir, { recursive: true });
app.use("/uploads", express.static(absUploadDir));

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/auth",          authRouter);
app.use("/api/files",     filesRouter);
app.use("/api/clauses",   clausesRouter);
app.use("/api/users",     usersRouter);
app.use("/api/changelog", changelogRouter);

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// Express 5 forwards rejected promises from async handlers here.
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Internal server error" });
});

module.exports = app;
