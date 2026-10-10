const prisma = require("../prisma");

// Records an entry in the audit trail. Never throws: a logging failure must
// not fail the request that triggered it.
async function logChange(action, description, auth) {
  try {
    await prisma.changeLog.create({
      data: { action, description, performedBy: auth?.email || "system" },
    });
  } catch (err) {
    console.error("Failed to log change:", err.message);
  }
}

const STANDARD_NAMES = { iso9001: "ISO 9001", iso27001: "ISO 27001", iso42001: "ISO 42001" };

// Human-readable name for a clause row, e.g. "ISO 27001 Annex A 5.1" or
// "NIST CSF ID.AM-1" (custom standards store their name in description).
function describeClause(clause) {
  if (!clause.standard) return clause.code;
  if (clause.standard.startsWith("custom_")) {
    return `${clause.description || clause.standard.slice(7)} ${clause.title || clause.code}`;
  }
  const label = clause.code.slice(clause.standard.length + 1).replace(/_/g, " ");
  return `${STANDARD_NAMES[clause.standard] || clause.standard} ${label}`;
}

module.exports = { logChange, describeClause };
