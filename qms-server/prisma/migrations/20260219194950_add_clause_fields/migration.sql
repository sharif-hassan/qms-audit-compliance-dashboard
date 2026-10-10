-- AlterTable
ALTER TABLE "Clause" ADD COLUMN     "auditQuestion" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "cycle" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "evaluatorNotes" TEXT,
ADD COLUMN     "isoClause" TEXT,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "responsibleParty" TEXT,
ADD COLUMN     "standard" TEXT NOT NULL DEFAULT 'iso9001',
ADD COLUMN     "std" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'question';

-- AlterTable
ALTER TABLE "FileClause" ADD COLUMN     "comment" TEXT;
