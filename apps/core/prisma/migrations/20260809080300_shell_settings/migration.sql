-- CreateTable
CREATE TABLE "ShellSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShellSetting_pkey" PRIMARY KEY ("key")
);
