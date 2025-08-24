# Database Setup for Anonymous Survey System

This directory contains the database schema and initialization scripts for the anonymous survey system.

## Files

- **`schema.sql`** - Complete database schema with table definitions, indexes, triggers, and functions
- **`init.sql`** - Database initialization script that creates a fresh database from scratch
- **`README.md`** - This file with setup instructions

## Database Structure

The system uses **PostgreSQL** with the following tables:

### 1. `surveys` - Main survey information
- `id`: Unique identifier (TEXT)
- `short_id`: Short alphanumeric ID for blockchain operations (8 chars, unique)
- `title`: Survey title
- `description`: Optional survey description
- `question`: Survey question
- `blind_signature_public_key`: RSA public key for blind signatures
- `encryption_public_key`: RSA public key for encryption
- `merkle_root`: Merkle root hash for commitment verification
- `is_published`: Whether survey is published
- `published_at`: Publication timestamp
- `total_responses`: Count of responses
- `blockchain_address`: Solana blockchain address
- `created_at`, `updated_at`: Timestamps

### 2. `tokens` - Access tokens for students
- `id`: Unique identifier
- `survey_id`: Reference to survey
- `token`: Unique token value
- `student_email`: Student's email address
- `used`: Whether token has been used
- `is_completed`: Whether survey was completed
- `created_at`, `updated_at`: Timestamps

### 3. `survey_responses` - Survey responses
- `id`: Unique identifier
- `survey_id`: Reference to survey
- `encrypted_answer`: RSA encrypted answer from blockchain
- `decrypted_answer`: Decrypted answer for analysis
- `commitment_hash`: SHA-256 hash commitment (unique)
- `created_at`, `updated_at`: Timestamps

### 4. `survey_private_keys` - Cryptographic private keys
- `id`: Unique identifier
- `survey_id`: Reference to survey (unique)
- `blind_signature_private_key`: RSA private key for blind signatures
- `encryption_private_key`: RSA private key for encryption
- `created_at`, `updated_at`: Timestamps

## Setup Instructions

### Option 1: Fresh Database Setup
```bash
# Connect to PostgreSQL and create database
createdb anonymous_survey

# Run initialization script
psql -U your_username -d anonymous_survey -f init.sql
```

### Option 2: Update Existing Database
```bash
# Connect to existing database and run schema
psql -U your_username -d your_database -f schema.sql
```

### Option 3: Using Docker
```bash
# If using Docker Compose, the database will be created automatically
# You can then run the schema manually:
docker exec -i your_postgres_container psql -U your_user -d your_db < schema.sql
```

## Environment Variables

Make sure your `.env` file has the correct database connection:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/anonymous_survey
```

## Features

- **Automatic Timestamps**: `updated_at` is automatically updated via triggers
- **Foreign Key Constraints**: Proper referential integrity
- **Indexes**: Performance optimization for common queries
- **Cascade Deletes**: Deleting a survey removes related data
- **Unique Constraints**: Prevents duplicate tokens and commitments

## Verification

After setup, verify the database structure:

```sql
-- List all tables
\dt

-- List all triggers
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Check table structure
\d surveys
\d tokens
\d survey_responses
\d survey_private_keys
```

## Notes

- The schema uses `TEXT` for IDs to maintain compatibility with existing code
- All timestamps use `TIMESTAMP(3)` for millisecond precision
- The `uuid-ossp` extension is enabled for UUID generation
- Foreign keys use `CASCADE` for automatic cleanup
