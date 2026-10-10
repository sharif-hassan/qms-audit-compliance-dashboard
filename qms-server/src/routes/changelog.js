const express = require("express");
const prisma = require("../prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Entries are written server-side by the routes that make changes, so the
// trail can't be forged from the client. There is intentionally no POST.
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const logs = await prisma.changeLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json(logs);
});

module.exports = router;
