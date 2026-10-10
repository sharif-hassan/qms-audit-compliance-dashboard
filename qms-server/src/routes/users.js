const router = require("express").Router();
const bcrypt = require("bcrypt");
const prisma = require("../prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logChange } = require("../utils/changelog");

const ALLOWED_ROLES = new Set(["ADMIN", "USER", "GUEST"]);
const PUBLIC_FIELDS = { id: true, name: true, email: true, role: true, createdAt: true };

// Every route here is admin-only.
router.use(requireAuth, requireRole("ADMIN"));

router.get("/", async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: PUBLIC_FIELDS,
  });
  res.json({ ok: true, users });
});

router.post("/", async (req, res) => {
  const { name = "", email, password, role = "USER" } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Email and password required" });
  }
  if (!ALLOWED_ROLES.has(role)) {
    return res.status(400).json({ ok: false, message: "Invalid role" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
      select: PUBLIC_FIELDS,
    });
    await logChange("USER_CREATED", `User ${user.email} was created with role ${user.role}`, req.auth);
    res.status(201).json({ ok: true, user });
  } catch (e) {
    if (e?.code === "P2002") {
      return res.status(400).json({ ok: false, message: "Email already exists" });
    }
    res.status(400).json({ ok: false, message: "Could not create user" });
  }
});

// Update name/email/role, and optionally password.
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, role, password } = req.body || {};
  const data = {};

  if (typeof name === "string") data.name = name;
  if (typeof email === "string") data.email = email;

  if (typeof role === "string") {
    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({ ok: false, message: "Invalid role" });
    }
    if (id === req.auth.userId && role !== "ADMIN") {
      return res.status(400).json({ ok: false, message: "You can't remove your own admin role" });
    }
    data.role = role;
  }

  if (typeof password === "string" && password.trim().length > 0) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ ok: false, message: "No fields provided to update" });
  }

  try {
    const user = await prisma.user.update({ where: { id }, data, select: PUBLIC_FIELDS });
    await logChange("USER_UPDATED", `User ${user.email} was updated`, req.auth);
    res.json({ ok: true, user });
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ ok: false, message: "User not found" });
    }
    if (e?.code === "P2002") {
      return res.status(400).json({ ok: false, message: "Email already exists" });
    }
    res.status(400).json({ ok: false, message: "Could not update user" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.auth.userId) {
    return res.status(400).json({ ok: false, message: "You can't delete your own account" });
  }

  try {
    const user = await prisma.user.delete({ where: { id }, select: PUBLIC_FIELDS });
    await logChange("USER_DELETED", `User ${user.email} was deleted`, req.auth);
    res.json({ ok: true });
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ ok: false, message: "User not found" });
    }
    res.status(400).json({ ok: false, message: "Could not delete user" });
  }
});

module.exports = router;
