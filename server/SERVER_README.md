# Anonymous Survey System - Backend Server

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [System Architecture](#system-architecture)
- [Cryptographic Features](#cryptographic-features)
- [Database Schema](#database-schema)
- [Security Features](#security-features)
- [Development & Testing](#development--testing)
- [Deployment](#deployment)
- [Related Documentation](#related-documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview
The school backend server handles blind signature operations, token management, survey processing, and blockchain integration for the anonymous survey system. It serves as the secure intermediary between students and the blockchain, ensuring cryptographic privacy while maintaining verifiable integrity.

## Key Features
- **Automatic cryptographic key generation** (RSA-2048 blind signature & encryption keys)
- **Blind signature generation** for anonymous participation
- **Token-based authentication** with automated email distribution
- **Professional email templates** with survey details and secure token delivery
- **Survey data encryption/decryption** 
- **Blockchain integration** for immutable storage
- **Merkle tree generation** for result verification
- **Redis caching** for performance optimization
- **Admin authentication** with JWT tokens

## Prerequisites
- **Node.js**: 16.0+
- **PostgreSQL**: 13.0+
- **Redis**: 6.0+ (for caching and session management)
- **SMTP server access** (for token distribution)
- **Solana RPC endpoint access**
- **Anchor framework** for Solana integration

## Installation

### Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp env.txt .env
# Edit .env with your configuration (see env.txt for all required variables)

# Setup database (using scripts in server/database)
# Option A: Fresh database
cd server/database && createdb anonymous_survey && psql -d anonymous_survey -f init.sql && cd -

# Option B: Apply/refresh schema to existing DB
psql -d anonymous_survey -f server/database/schema.sql

# Start development server
npm run dev

# Start production server
npm start
```

## Configuration

### Environment Variables
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/survey_db

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Authentication
JWT_SECRET=your_secure_jwt_secret_here

# Admin Credentials
ADMIN_EMAIL=admin@school.edu
ADMIN_PASSWORD_HASH=your_bcrypt_hashed_password

# Email Configuration (for token distribution)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@school.edu
SMTP_PASS=your_email_password
SMTP_FROM=no-reply@school.edu

# Solana Blockchain
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=your_deployed_program_id_here
KEY_SOLANA=["your","solana","private","key","as","json","array"]
```

## Project Structure
```
server/
├── src/
│   ├── controllers/     # HTTP request handlers
│   │   ├── survey.controller.ts
│   │   ├── crypto.controller.ts
│   │   ├── token.controller.ts
│   │   └── response.controller.ts
│   ├── services/        # Business logic layer
│   │   ├── survey.service.ts
│   │   ├── crypto.service.ts
│   │   ├── token.service.ts
│   │   ├── blockchain.service.ts
│   │   ├── response.service.ts
│   │   └── auth.service.ts
│   ├── routes/          # API route definitions
│   │   ├── survey.routes.ts
│   │   ├── crypto.routes.ts
│   │   ├── token.routes.ts
│   │   └── auth.routes.ts
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models (Raw SQL)
│   ├── utils/           # Utility functions
│   └── config/          # Configuration files
├── prisma/              # SQL migration files
└── tests/               # Test files
```

## REST API Documentation

> **📚 Complete API Documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for comprehensive endpoint details, request/response examples, and usage guides.
> 
> **🔧 Interactive API docs**: Available at `/api-docs` (Swagger UI) when server is running.
> 
> **📊 Quick status**: Available at `/api-status`.

### Quick API Overview

The API includes the following endpoint groups:

- **System**: `/health`, `/api-status`, `/api-docs`
- **Authentication**: `/api/auth/*` (login, refresh)
- **Surveys**: `/api/surveys/*` (CRUD, stats, results, keys, publishing)
- **Tokens**: `/api/tokens/*` (generation, validation, management)
- **Responses**: `/api/responses/*` (submission, decryption, verification)
- **Cryptography**: `/api/crypto/*` (blind signatures, commitments, keys)
- **Public Responses**: `/api/public-responses/*` (curation, visibility)

**Total Endpoints**: 35+ endpoints across 7 main categories

## Quick Start Examples

### Basic Survey Creation Flow
```bash
# 1. Login
JWT_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.edu","password":"admin123"}' | jq -r '.token')

# 2. Create Survey
SURVEY_ID=$(curl -s -X POST http://localhost:3000/api/surveys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"title":"Course Feedback","description":"CS101","question":"Rate this course"}' | jq -r '.id')

# 3. Generate Tokens
curl -X POST http://localhost:3000/api/tokens/batch-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"surveyId":"'"$SURVEY_ID"'","students":[{"email":"student@university.edu"}]}'
```

### Student Participation Flow
```bash
# 1. Validate Token
curl -X GET "http://localhost:3000/api/tokens/validate/abc123?surveyId=survey_12345"

# 2. Get Public Keys
curl -X GET http://localhost:3000/api/surveys/survey_12345/keys

# 3. Request Blind Signature
curl -X POST http://localhost:3000/api/crypto/blind-sign/survey_12345 \
  -H "Content-Type: application/json" \
  -d '{"blindedMessage":"base64-encoded-message"}'
```

> **📚 For detailed examples and complete API reference**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## System Architecture Flow

### 1. Survey Setup (Automated)
```javascript
// When school creates survey, server automatically:
// 1. Generates RSA-2048 blind signature key pair
// 2. Generates RSA-2048 encryption key pair  
// 3. Stores private keys securely in database
// 4. Creates survey on Solana blockchain with public keys
// 5. Returns survey ID and public keys to client
```

### 2. Token Distribution (Email-based)
```javascript
// When school generates tokens:
// 1. Creates cryptographically secure random tokens
// 2. Maps tokens to student emails in database
// 3. Sends tokens via SMTP email to students
// 4. Tokens include survey URL and participation instructions
```

### 3. Student Authentication & Participation
```javascript
// Student participation flow:
// 1. Student receives token via email
// 2. Client validates token with server
// 3. Client gets survey public keys from server
// 4. Client generates blinded message locally
// 5. Client requests blind signature from server
// 6. Client finalizes signature and submits (school may submit on-chain; ciphertext is not retained post-publish)
// 7. Server marks token as completed and stores decrypted answer off-chain when processed
```

### 4. Result Processing & Verification
```javascript
// After survey collection period:
// 1. Server decrypts and stores responses in DB (source of truth for display)
// 2. Server generates Merkle root from commitments
// 3. Server publishes results with Merkle root on-chain
//    (smart contract clears on-chain encrypted_answers in publish_results)
// 4. Public verifies results via commitments + Merkle root; UI reads distributions from DB
```

## Email Functionality

### SMTP Configuration
The system supports various SMTP providers including:
- **Office 365** (smtp.office365.com:587)
- **Gmail** (smtp.gmail.com:587)
- **Custom SMTP servers**

### Email Features
- **Automated token distribution** to student emails
- **Professional HTML email templates** with survey details
- **Plain text fallback** for email clients that don't support HTML
- **Batch email processing** with success/failure tracking
- **SMTP connection testing** endpoint for troubleshooting

### Email Templates
Each student receives a personalized email containing:
- Survey title, description, and question
- Unique access token (securely displayed)
- Direct link to participate in the survey
- Privacy and security instructions

### Testing Email Service
```bash
# Test SMTP connection (admin only)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/tokens/test-email

# End-to-end: create a survey and send token to your email
JWT_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.edu","password":"admin123"}' | jq -r '.token')

SURVEY_ID=$(curl -s -X POST http://localhost:3000/api/surveys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"title":"Email Test Survey","description":"Testing email","question":"How is it?"}' | jq -r '.id')

curl -s -X POST http://localhost:3000/api/tokens/batch-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"surveyId":"'"$SURVEY_ID"'","students":[{"email":"your_email@example.com"}]}'
```

## Cryptographic Features

### Blind Signatures (RSA-BSSA)
- **Library**: `@cloudflare/blindrsa-ts`
- **Algorithm**: RSA-BSSA with SHA-384 and PSS padding
- **Key Size**: 2048-bit RSA keys
- **Purpose**: Ensures student anonymity during participation

### Response Encryption (RSA-OAEP)
- **Algorithm**: RSA-OAEP with SHA-256
- **Key Size**: 2048-bit RSA keys  
- **Purpose**: Protects response privacy on blockchain

### Commitment Scheme (SHA-256)
- **Algorithm**: SHA-256 hash function
- **Purpose**: Integrity verification and result validation
- **Storage**: 32-byte hashes stored on blockchain

### Merkle Tree Verification
- **Implementation**: Binary Merkle tree with SHA-256
- **Purpose**: Efficient batch verification of all commitments
- **Verification**: Public can verify results without private data

## Database Schema

### Core Tables
```sql
-- Surveys with auto-generated cryptographic keys
CREATE TABLE surveys (
  id VARCHAR PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  question TEXT NOT NULL,
  blind_signature_public_key TEXT NOT NULL,  -- Base64 encoded
  encryption_public_key TEXT NOT NULL,       -- Base64 encoded
  blockchain_address VARCHAR(255),
  is_published BOOLEAN DEFAULT FALSE,
  total_responses INTEGER DEFAULT 0,
  is_public_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Private keys stored separately for security
CREATE TABLE survey_private_keys (
  survey_id VARCHAR PRIMARY KEY REFERENCES surveys(id) ON DELETE CASCADE,
  blind_signature_private_key TEXT NOT NULL,  -- Base64 encoded, encrypted
  encryption_private_key TEXT NOT NULL,       -- Base64 encoded, encrypted
  created_at TIMESTAMP DEFAULT NOW()
);

-- Student authentication tokens
CREATE TABLE tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  survey_id VARCHAR REFERENCES surveys(id) ON DELETE CASCADE,
  student_email VARCHAR(255) NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Decrypted survey responses (after processing)
CREATE TABLE survey_responses (
  id SERIAL PRIMARY KEY,
  survey_id VARCHAR REFERENCES surveys(id) ON DELETE CASCADE,
  decrypted_answer TEXT NOT NULL,
  commitment_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Public responses for curated survey display
CREATE TABLE public_responses (
  id VARCHAR PRIMARY KEY,
  survey_id VARCHAR REFERENCES surveys(id) ON DELETE CASCADE,
  response_id VARCHAR REFERENCES survey_responses(id) ON DELETE CASCADE,
  is_positive BOOLEAN NOT NULL,
  published_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(survey_id, response_id)
);
```

## Security Features

### Cryptographic Security
- **RSA-2048** keys for all cryptographic operations
- **Automatic key generation** with secure random number generation
- **Private key isolation** in separate database table
- **Base64 encoding** for safe key storage and transmission

### Authentication & Authorization  
- **JWT tokens** for admin authentication with configurable expiration
- **bcrypt password hashing** for admin credentials
- **Token-based student authentication** with one-time use validation
- **Rate limiting** on sensitive endpoints

### Data Protection
- **Input validation** on all API endpoints
- **SQL injection prevention** via parameterized queries
- **XSS protection** with proper response headers
- **CORS configuration** for cross-origin security

### Blockchain Security
- **Solana keypair management** via environment variables
- **Transaction signing** with proper error handling
- **PDA (Program Derived Address)** generation for deterministic addresses

## Performance Optimizations

### Caching Strategy
- **Redis caching** for frequently accessed surveys and tokens
- **Cache invalidation** on data updates
- **TTL configuration** for automatic cache expiration

### Database Optimizations
- **Connection pooling** via pg.Pool
- **Indexed queries** on frequently searched fields
- **Batch operations** for token generation and validation

## Development & Testing

### Development Commands
```bash
npm run dev              # Start development server with hot reload
npm run build            # Build TypeScript to JavaScript
npm run start            # Start production server
npm run type-check       # Run TypeScript type checking
npm run lint             # Run ESLint code analysis
```

### Database Management  
```bash
# Apply SQL migrations
psql -d anonymous_survey -f server/database/schema.sql

# Connect to database
psql "postgresql://postgres:postgres@localhost:5432/anonymous_survey"
```

### Testing
```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate test coverage report
```

## Deployment

### Docker Deployment
```bash
# Build Docker image
docker build -t survey-backend .

# Run with environment variables
docker run -p 3000:3000 \
  -e DATABASE_URL=your_db_url \
  -e REDIS_URL=your_redis_url \
  -e KEY_SOLANA='["your","private","key"]' \
  survey-backend
```

### Production Considerations
- **Environment variables** must be properly configured
- **Database migrations** should be run before deployment
- **Redis instance** must be accessible
        - **SMTP credentials** must be valid for email functionality (Office 365, Gmail, etc.)
- **Solana RPC endpoint** must be reliable and funded

## Error Handling

### Common Error Codes
- **400 Bad Request**: Invalid input parameters
- **401 Unauthorized**: Missing or invalid JWT token  
- **404 Not Found**: Survey, token, or resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server-side errors

### Debugging
- **Structured logging** with timestamp and request ID
- **Error details** in development mode
- **Health check endpoint** at `/health`
- **Database connection monitoring**

## Related Documentation
- [Main System Overview](../README.md)
- [System Architecture](../SYSTEM_DESIGN.md)
- [Blockchain Component](../blockchain/README.md)
- [Client Application](../client/README.md)
- [Documentation Standards](../DOCUMENTATION_STANDARDS.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details. 