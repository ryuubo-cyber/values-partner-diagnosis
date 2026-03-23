-- CreateTable
CREATE TABLE "diagnosis_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "currentCategoryIndex" INTEGER NOT NULL DEFAULT 0,
    "completedQuestionCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "lastAnsweredAt" DATETIME,
    "completedAt" DATETIME,
    "resultGeneratedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "diagnosis_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL DEFAULT '',
    "birthPlace" TEXT NOT NULL DEFAULT '',
    "currentResidence" TEXT NOT NULL DEFAULT '',
    "favoriteMusic" TEXT NOT NULL DEFAULT '',
    "politicalInterest" TEXT NOT NULL DEFAULT '',
    "occupation" TEXT NOT NULL DEFAULT '',
    "familyStructure" TEXT NOT NULL DEFAULT '',
    "lifestyle" TEXT NOT NULL DEFAULT '',
    "smartphone" TEXT NOT NULL DEFAULT '',
    "snsUsage" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "diagnosis_profiles_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "diagnosis_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "diagnosis_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "reverseScore" BOOLEAN NOT NULL DEFAULT false,
    "activeFlag" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "diagnosis_answers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "answer" INTEGER NOT NULL,
    "answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "diagnosis_answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "diagnosis_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "diagnosis_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "categoryScores" TEXT NOT NULL,
    "weightedScores" TEXT NOT NULL,
    "mainType" TEXT NOT NULL,
    "subType" TEXT NOT NULL,
    "highCategories" TEXT NOT NULL,
    "lowCategories" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "diagnosis_scores_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "diagnosis_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "diagnosis_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "reportJson" TEXT NOT NULL,
    "reportText" TEXT NOT NULL DEFAULT '',
    "modelName" TEXT NOT NULL DEFAULT '',
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "diagnosis_reports_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "diagnosis_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_profiles_sessionId_key" ON "diagnosis_profiles"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_answers_sessionId_questionId_key" ON "diagnosis_answers"("sessionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_scores_sessionId_key" ON "diagnosis_scores"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_reports_sessionId_key" ON "diagnosis_reports"("sessionId");
