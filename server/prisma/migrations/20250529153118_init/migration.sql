-- AlterTable
ALTER TABLE "surveys" ADD COLUMN     "blockchainAddress" TEXT;

-- CreateTable
CREATE TABLE "survey_private_keys" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "blind_signature_private_key" TEXT NOT NULL,
    "encryption_private_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_private_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "survey_private_keys_survey_id_key" ON "survey_private_keys"("survey_id");

-- AddForeignKey
ALTER TABLE "survey_private_keys" ADD CONSTRAINT "survey_private_keys_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
