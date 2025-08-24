-- Database Initialization Script for Anonymous Survey System
-- Run this script to create a fresh database

-- Connect to your database first, then run this script
-- psql -U your_username -d your_database_name -f init.sql

-- Drop existing tables if they exist (WARNING: This will delete all data!)
DROP TABLE IF EXISTS "survey_private_keys" CASCADE;
DROP TABLE IF EXISTS "survey_responses" CASCADE;
DROP TABLE IF EXISTS "tokens" CASCADE;
DROP TABLE IF EXISTS "surveys" CASCADE;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create surveys table
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "short_id" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "question" TEXT NOT NULL,
    "blind_signature_public_key" TEXT NOT NULL,
    "encryption_public_key" TEXT NOT NULL,
    "merkle_root" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "total_responses" INTEGER NOT NULL DEFAULT 0,
    "blockchain_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- Create tokens table
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "student_email" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tokens_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create survey_responses table
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "encrypted_answer" TEXT NOT NULL,
    "decrypted_answer" TEXT NOT NULL,
    "commitment_hash" TEXT NOT NULL UNIQUE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create survey_private_keys table
CREATE TABLE "survey_private_keys" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL UNIQUE,
    "blind_signature_private_key" TEXT NOT NULL,
    "encryption_private_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "survey_private_keys_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "survey_private_keys_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for better performance
CREATE INDEX "idx_surveys_short_id" ON "surveys"("short_id");
CREATE INDEX "idx_surveys_is_published" ON "surveys"("is_published");
CREATE INDEX "idx_surveys_created_at" ON "surveys"("created_at");
CREATE INDEX "idx_tokens_survey_id" ON "tokens"("survey_id");
CREATE INDEX "idx_tokens_student_email" ON "tokens"("student_email");
CREATE INDEX "idx_tokens_used" ON "tokens"("used");
CREATE INDEX "idx_survey_responses_survey_id" ON "survey_responses"("survey_id");
CREATE INDEX "idx_survey_responses_commitment_hash" ON "survey_responses"("commitment_hash");

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON "surveys"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tokens_updated_at BEFORE UPDATE ON "tokens"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_responses_updated_at BEFORE UPDATE ON "survey_responses"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_private_keys_updated_at BEFORE UPDATE ON "survey_private_keys"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify tables were created
\dt

-- Verify triggers were created
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Success message
SELECT 'Database initialized successfully!' as status;
