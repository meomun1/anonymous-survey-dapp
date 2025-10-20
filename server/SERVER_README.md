# Anonymous Survey System - Backend Server (University Scale)

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
The university-scale backend server handles campaign-based survey management, university structure administration, batch response processing, and blockchain integration for the anonymous survey system. It supports 1000-2000 students and 4000-8000 course surveys per semester, serving as the secure intermediary between students and the blockchain while ensuring cryptographic privacy and verifiable integrity for accreditation purposes.

## Key Features

### University Management
- **University structure management** (schools, teachers, courses, students)
- **Campaign-based survey system** (semester-level organization)
- **Batch operations** for handling 34,000+ responses per semester
- **Teacher performance tracking** with accreditation-ready verification
- **Student completion monitoring** and participation analytics

### Survey & Campaign Features
- **Automatic cryptographic key generation** (RSA-2048 blind signature & encryption keys)
- **Template-based survey system** with pre-built question sets (25-question teaching quality assessment)
- **Campaign workflow management** (open → close → launch → publish)
- **Blind signature generation** for anonymous participation (campaign-scoped)
- **Token-based authentication** with automated email distribution
- **Professional email templates** with survey details and secure token delivery

### Advanced Processing
- **Survey data encryption/decryption** with enhanced answer string format
- **Batch response processing** with off-chain Merkle tree calculation
- **Blockchain integration** for immutable storage and hierarchical verification
- **Merkle tree generation** for result verification and teacher performance proof
- **Redis caching** for performance optimization
- **Admin authentication** with JWT tokens
- **Comprehensive analytics** with university-wide statistics and teacher performance metrics

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

# Setup database with university schema
cd server/database && createdb anonymous_survey_university && psql -d anonymous_survey_university -f university-schema.sql && cd -

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
│   │   ├── campaign.controller.ts          # New: Campaign management
│   │   ├── university.controller.ts        # New: University structure
│   │   ├── analytics.controller.ts         # New: Analytics & reporting
│   │   ├── crypto.controller.ts
│   │   ├── token.controller.ts
│   │   └── response.controller.ts
│   ├── services/        # Business logic layer
│   │   ├── survey.service.ts
│   │   ├── campaign.service.ts             # New: Campaign operations
│   │   ├── university.service.ts           # New: University management
│   │   ├── analytics.service.ts            # New: Analytics & Merkle calculations
│   │   ├── crypto.service.ts
│   │   ├── token.service.ts
│   │   ├── blockchain.service.ts
│   │   ├── response.service.ts
│   │   └── auth.service.ts
│   ├── routes/          # API route definitions
│   │   ├── survey.routes.ts
│   │   ├── campaign.routes.ts              # New: Campaign endpoints
│   │   ├── university.routes.ts            # New: University management
│   │   ├── analytics.routes.ts             # New: Analytics endpoints
│   │   ├── crypto.routes.ts
│   │   ├── token.routes.ts
│   │   └── auth.routes.ts
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models (Raw SQL)
│   ├── utils/           # Utility functions
│   └── config/          # Configuration files
├── database/            # Database schema and migrations
│   ├── university-schema.sql               # New: University schema
│   └── init.sql
└── tests/               # Test files
```

## REST API Documentation

> **📚 Complete API Documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for comprehensive endpoint details, request/response examples, and usage guides.
> 
> **🔧 Interactive API docs**: Available at `/api-docs` (Swagger UI) when server is running.
> 
> **📊 Quick status**: Available at `/api-status`.

### Quick API Overview

The API includes the following endpoint groups (campaign-first):

- **System**: `/health`, `/api-status`, `/api-docs`
- **Authentication**: `/api/auth/*` (login, refresh)
- **University Management**: `/api/university/*` (schools, teachers, courses, students, semesters)
- **Assignments & Enrollments**: `/api/university/course-assignments/*`, `/api/university/enrollments/*`
- **Campaigns**: `/api/campaigns/*` (CRUD, open, close, launch, publish, surveys, stats, analytics)
- **Surveys**: `/api/surveys/*` (CRUD, list by campaign, list by token)
- **Tokens**: `/api/tokens/*` (campaign token generation, validate, mark, list)
- **Responses**: `/api/responses/*` (ingest from chain, decrypt-campaign, parsed-by-survey, commitment lookup, verify)
- **Crypto**: `/api/crypto/*` (campaign blind-sign, campaign decrypt, campaign public-keys, commitments, merkle)
- **Analytics**: `/api/analytics/*` (merkle ops, campaign analytics, teacher performance, student completion, university/school)

**Total Endpoints**: 80+ endpoints across core categories above

## Quick Start Examples

### University Campaign Creation Flow
```bash
# 1. Login
JWT_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@university.edu","password":"admin123"}' | jq -r '.token')

# 2. Create Campaign
CAMPAIGN_ID=$(curl -s -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"name":"Fall 2024 Course Surveys","semester":"Fall 2024","type":"course"}' | jq -r '.id')

# 3. Open Campaign for Teacher Input
curl -X POST http://localhost:3000/api/campaigns/$CAMPAIGN_ID/open \
  -H "Authorization: Bearer $JWT_TOKEN"

# 4. Launch Campaign (Generate Surveys & Tokens)
curl -X POST http://localhost:3000/api/campaigns/$CAMPAIGN_ID/launch \
  -H "Authorization: Bearer $JWT_TOKEN"

# 5. Get Campaign Analytics
curl -X GET http://localhost:3000/api/campaigns/$CAMPAIGN_ID/analytics \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Student Participation Flow (Campaign-first)
```bash
# 1. Validate Campaign Token
curl -X GET "http://localhost:3000/api/tokens/validate/abc123"

# 2. Get student's eligible surveys for this token
curl -X GET http://localhost:3000/api/surveys/token/abc123

# 3. Get campaign public keys (for the related campaignId)
curl -X GET http://localhost:3000/api/crypto/campaigns/CAMPAIGN_ID/public-keys

# 4. Request blind signature for a blinded message (campaign)
curl -X POST http://localhost:3000/api/crypto/campaigns/CAMPAIGN_ID/blind-sign \
  -H "Content-Type: application/json" \
  -d '{"blindedMessage":"base64-encoded-message"}'

# 5. Client submits responses on-chain (no server endpoint)
# ... client-side blockchain submission ...
```

> **📚 For detailed examples and complete API reference**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## System Architecture Flow

### 1. Campaign Setup (Automated)
```javascript
// When admin creates campaign, server automatically:
// 1. Generates RSA-2048 blind signature key pair for campaign
// 2. Generates RSA-2048 encryption key pair for campaign
// 3. Stores private keys securely in database
// 4. Creates campaign on Solana blockchain with public keys
// 5. Returns campaign ID and public keys to client
```

### 2. Token Distribution (Campaign-based)
```javascript
// When campaign launches:
// 1. Creates cryptographically secure random tokens for all enrolled students
// 2. Maps tokens to student emails in database (campaign-level)
// 3. Sends tokens via SMTP email to students
// 4. Tokens include campaign dashboard URL and participation instructions
```

### 3. Student Authentication & Participation (Enhanced)
```javascript
// Student participation flow:
// 1. Student receives token via email
// 2. Client validates token with server (campaign-level validation)
// 3. Client gets available surveys for student from server
// 4. Client gets survey public keys from server
// 5. Client generates blinded messages locally for multiple surveys
// 6. Client requests blind signatures from server
// 7. Client finalizes signatures and batch submits to blockchain
// 8. Server marks token as completed and processes responses when campaign closes
```

### 4. Campaign Result Processing & Verification (Campaign-first)
```javascript
// After campaign collection period:
// 1. Admin closes campaign to prevent new submissions
// 2. Server ingests encrypted responses from blockchain: POST /api/responses/ingest/{campaignId}
// 3. Server decrypts and parses: POST /api/responses/decrypt-campaign/{campaignId}
// 4. Server calculates Merkle roots (off-chain): POST /api/analytics/merkle/*
// 5. Server publishes campaign results (service/controller)
// 6. Server updates final hierarchical Merkle root (university-level)
// 7. Verification via commitments + Merkle root; UI reads analytics from DB
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
- Campaign title and context
- Unique access token (securely displayed)
- Campaign portal link (client) to access eligible surveys
- Privacy and security instructions

### Testing Email Service
```bash
# Test SMTP connection (admin only)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/tokens/test-email

# End-to-end: generate campaign tokens and email
JWT_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.edu","password":"admin123"}' | jq -r '.token')

SURVEY_ID=$(curl -s -X POST http://localhost:3000/api/surveys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"title":"Email Test Survey","description":"Testing email","question":"How is it?"}' | jq -r '.id')

curl -s -X POST http://localhost:3000/api/tokens/campaign/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"campaignId":"YOUR_CAMPAIGN_ID","studentEmails":["your_email@example.com"]}'
```

## Cryptographic Features

The system implements RSA-based cryptography for secure, anonymous survey participation:
- **Blind Signatures**: RSA-BSSA with SHA-384 for anonymous participation
- **Response Encryption**: RSA-OAEP with SHA-256 for data privacy
- **Commitment Scheme**: SHA-256 hashes for integrity verification
- **Merkle Trees**: For efficient batch verification of results

For detailed cryptographic implementation, see [CRYPTO_README.md](../protocol/CRYPTO_README.md).

## Database Schema

### University Schema Overview
The university-scale database includes 20+ tables organized into these main categories:

#### University Structure
- `schools` - University schools/departments
- `teachers` - Faculty members with school associations
- `courses` - Course catalog with school associations
- `students` - Student records with school associations
- `semesters` - Academic semester management

#### Campaign Management
- `survey_campaigns` - Semester-level campaigns with cryptographic keys
- `surveys` - Individual surveys within campaigns (lightweight)
- `course_assignments` - Teacher-course assignments
- `enrollments` - Student-course enrollments

#### Response Processing
- `survey_responses` - Encrypted responses from blockchain (campaign-level)
- `decrypted_responses` - Decrypted responses with extracted metadata
- `parsed_responses` - Parsed answers for analytics
- `survey_tokens` - Campaign-level token management

#### Analytics & Verification
- `survey_analytics` - Campaign-level analytics
- `teacher_performance` - Teacher performance tracking
- `student_completion` - Student participation tracking

> **📚 Complete Schema**: See [university-schema.sql](./database/university-schema.sql) for the full database structure with all tables, relationships, and indexes.

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
- [Blockchain Component](../blockchain/BLOCKCHAIN_README.md)
- [Client Application](../client/CLIENT_README.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details. 