-- CreateTable
CREATE TABLE "TestModal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "govNumber" TEXT NOT NULL,
    "made" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestModal_pkey" PRIMARY KEY ("id")
);
