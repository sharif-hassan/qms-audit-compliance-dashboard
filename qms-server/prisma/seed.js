// Seeds the three built-in standards and a default admin account.
//
// This runs on every `start.sh` / `start.ps1`, so it must be safe to re-run:
// existing rows only get their structural fields (standard/type) refreshed and
// never have user edits or the admin's password overwritten.
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const iso9001Data = require("./data/iso9001.json");
const iso27001Data = require("./data/iso27001.json");
const iso42001Data = require("./data/iso42001.json");

const prisma = new PrismaClient();

const joinList = (value) => (Array.isArray(value) ? value.join(", ") : value) || null;

async function upsertClause(data) {
  await prisma.clause.upsert({
    where:  { code: data.code },
    update: { standard: data.standard, type: data.type },
    create: data,
  });
}

async function seedIso9001() {
  for (const item of iso9001Data) {
    await upsertClause({
      code:             `iso9001_${item.clause}`,
      standard:         "iso9001",
      type:             item.type,
      isoClause:        item.isoClause        || null,
      auditQuestion:    item.auditQuestion    || null,
      std:              item.std              || null,
      cycle:            item.cycle            || null,
      responsibleParty: item.responsibleParty || null,
    });
  }
}

async function seedIso27001() {
  for (const item of iso27001Data) {
    await upsertClause({
      code:             `iso27001_${item.standard}`.replace(/\s+/g, "_"),
      standard:         "iso27001",
      type:             "question",
      isoClause:        item.standard || null,
      category:         item.category || null,
      title:            item.title || null,
      description:      item.description || null,
      reference:        joinList(item.reference),
      evaluatorNotes:   item.evaluatorNotes?.trim() || null,
      responsibleParty: joinList(item.responsible),
    });
  }
}

// The ISO 42001 source data marks both "4" and "4.1" as "header"; split them
// into sections and subsections by the shape of the clause number.
function iso42001Type(item) {
  if (item.type !== "header") return "question";
  return /^\d+\.\d+$/.test(String(item.clause).trim()) ? "subsection" : "section";
}

async function seedIso42001() {
  for (const item of iso42001Data) {
    const type = iso42001Type(item);
    await upsertClause({
      code:             `iso42001_${item.clause}`,
      standard:         "iso42001",
      type,
      isoClause:        item.isoClause ? item.isoClause.replace(/^\d+(\.\d+)?\s*/, "") : null,
      auditQuestion:    type === "question" ? item.auditQuestion || null : null,
      std:              item.std              || null,
      cycle:            item.cycle            || null,
      responsibleParty: item.responsibleParty || null,
    });
  }
}

async function seedAdmin() {
  const email = "admin@example.com";
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where:  { email },
    update: {},
    create: { email, name: "Admin", passwordHash, role: "ADMIN" },
  });
  console.log("Seeded admin:", email);
}

async function main() {
  await seedIso9001();
  await seedIso27001();
  await seedIso42001();
  await seedAdmin();
  console.log("Seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
