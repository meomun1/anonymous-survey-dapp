-- Anonymous Survey Database Schema
-- This schema represents the current database structure for the anonymous survey system
-- Based on Prisma schema and migration files

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create surveys table
CREATE TABLE IF NOT EXISTS "surveys" (
    "id" TEXT NOT NULL,
    "short_id" TEXT NOT NULL UNIQUE, -- Short alphanumeric ID for blockchain (8 chars)
    "title" TEXT NOT NULL,
    "description" TEXT,
    "question" TEXT NOT NULL,
    "blind_signature_public_key" TEXT NOT NULL, -- RSA public key for blind signatures
    "encryption_public_key" TEXT NOT NULL, -- RSA public key for encryption
    "merkle_root" TEXT, -- Merkle root of all commitments
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3), -- When the survey was published
    "total_responses" INTEGER NOT NULL DEFAULT 0,
    "blockchain_address" TEXT, -- Address of the survey on the blockchain
    "is_public_enabled" BOOLEAN NOT NULL DEFAULT false, -- Whether public survey page is accessible
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- Create tokens table
CREATE TABLE IF NOT EXISTS "tokens" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE, -- The actual token value
    "student_email" TEXT NOT NULL, -- Student's email for token distribution
    "used" BOOLEAN NOT NULL DEFAULT false, -- Whether the token has been used
    "is_completed" BOOLEAN NOT NULL DEFAULT false, -- Whether the survey was completed
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tokens_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create survey_responses table
CREATE TABLE IF NOT EXISTS "survey_responses" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "encrypted_answer" TEXT NOT NULL, -- RSA encrypted answer from blockchain
    "decrypted_answer" TEXT NOT NULL, -- Decrypted answer for school analysis
    "commitment_hash" TEXT NOT NULL UNIQUE, -- Hash commitment for verification
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create public_responses table for curated public survey responses
CREATE TABLE IF NOT EXISTS "public_responses" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "is_positive" BOOLEAN NOT NULL, -- Whether this response is marked as positive
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "public_responses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "public_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "public_responses_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "public_responses_unique" UNIQUE ("survey_id", "response_id")
);

-- Create survey_private_keys table
CREATE TABLE IF NOT EXISTS "survey_private_keys" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL UNIQUE,
    "blind_signature_private_key" TEXT NOT NULL, -- RSA private key for blind signatures
    "encryption_private_key" TEXT NOT NULL, -- RSA private key for encryption
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "survey_private_keys_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "survey_private_keys_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_surveys_short_id" ON "surveys"("short_id");
CREATE INDEX IF NOT EXISTS "idx_surveys_is_published" ON "surveys"("is_published");
CREATE INDEX IF NOT EXISTS "idx_surveys_created_at" ON "surveys"("created_at");
CREATE INDEX IF NOT EXISTS "idx_surveys_is_public_enabled" ON "surveys"("is_public_enabled");
CREATE INDEX IF NOT EXISTS "idx_tokens_survey_id" ON "tokens"("survey_id");
CREATE INDEX IF NOT EXISTS "idx_tokens_student_email" ON "tokens"("student_email");
CREATE INDEX IF NOT EXISTS "idx_tokens_used" ON "tokens"("used");
CREATE INDEX IF NOT EXISTS "idx_survey_responses_survey_id" ON "survey_responses"("survey_id");
CREATE INDEX IF NOT EXISTS "idx_survey_responses_commitment_hash" ON "survey_responses"("commitment_hash");
CREATE INDEX IF NOT EXISTS "idx_public_responses_survey_id" ON "public_responses"("survey_id");
CREATE INDEX IF NOT EXISTS "idx_public_responses_response_id" ON "public_responses"("response_id");

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

CREATE TRIGGER update_public_responses_updated_at BEFORE UPDATE ON "public_responses"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_private_keys_updated_at BEFORE UPDATE ON "survey_private_keys"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional - for development/testing)
-- INSERT INTO "surveys" (id, short_id, title, description, question, blind_signature_public_key, encryption_public_key) 
-- VALUES ('sample-survey-1', 'SAMPLE01', 'Sample Survey', 'This is a sample survey', 'What is your favorite color?', 'sample-public-key', 'sample-encryption-key');

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
