-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clause" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT,

    CONSTRAINT "Clause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileClause" (
    "fileId" INTEGER NOT NULL,
    "clauseId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileClause_pkey" PRIMARY KEY ("fileId","clauseId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Clause_code_key" ON "Clause"("code");

-- CreateIndex
CREATE INDEX "FileClause_clauseId_idx" ON "FileClause"("clauseId");

-- AddForeignKey
ALTER TABLE "FileClause" ADD CONSTRAINT "FileClause_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileClause" ADD CONSTRAINT "FileClause_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "Clause"("id") ON DELETE CASCADE ON UPDATE CASCADE;
