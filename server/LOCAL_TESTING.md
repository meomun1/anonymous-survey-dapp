# Local Testing Guide for Anonymous Survey Server

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Running Local Services](#running-local-services)
- [Testing the Server](#testing-the-server)
- [API Testing Examples](#api-testing-examples)
- [Automated Testing](#automated-testing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
```bash
# Node.js 16+ and npm
node --version  # Should be 16+
npm --version

# Docker and Docker Compose
docker --version
docker-compose --version

# PostgreSQL client (optional, for direct DB access)
psql --version

# Redis CLI (optional, for direct Redis access)
redis-cli --version
```

### Optional Tools
- **Postman** or **Insomnia** for API testing
- **pgAdmin** for database management
- **RedisInsight** for Redis management

## Environment Setup

### 1. Clone and Install Dependencies
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Copy environment template
cp env.txt .env
```

### 2. Configure Environment Variables
Edit your `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database (matches docker-compose)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/anonymous_survey?schema=public"

# Redis (matches docker-compose)
REDIS_URL="redis://localhost:6379"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="24h"

# Admin Credentials
ADMIN_EMAIL="admin@school.edu"
ADMIN_PASSWORD_HASH="$2b$10$7ajMBL9Hv2f01S7w3gn6s.lGBGe90SQ0nTflSuapteFY9Su1uTneG"

# Email Configuration (for testing - use Ethereal Email)
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your_ethereal_username"
SMTP_PASS="your_ethereal_password"
SMTP_FROM="noreply@school.edu"

# Solana Configuration
SOLANA_RPC_URL="http://localhost:8899"
PROGRAM_ID="your_program_id_here"
KEY_SOLANA="[235,139,168,94,13,171,1,178,186,199,51,193,157,104,151,200,122,157,150,72]"
```

### 3. Generate Admin Password Hash
```bash
# Generate a new admin password hash
npm run generate-admin-hash

# Follow prompts and update ADMIN_PASSWORD_HASH in .env
```

## Running Local Services

### 1. Start Database and Redis (Docker)
```bash
# Start PostgreSQL and Redis containers
docker-compose up -d

# Verify services are running
docker-compose ps

# Check health status
docker-compose logs postgres
docker-compose logs redis
```

### 2. Setup Database Schema
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed database with test data
npx prisma db seed
```

### 3. Start Solana Local Validator (Optional)
```bash
# If testing blockchain functionality
solana-test-validator --reset

# In another terminal, check validator status
solana cluster-version
```

### 4. Start the Server
```bash
# Development mode (with hot reload)
npm run dev

# Or build and run production mode
npm run build
npm start
```

### 5. Verify Server is Running
```bash
# Check server health
curl http://localhost:3000/health

# Expected response: {"status": "ok", "timestamp": "..."}
```

## Testing the Server

### 1. Database Testing
```bash
# Open Prisma Studio (visual database browser)
npx prisma studio

# Or connect directly with psql
psql "postgresql://postgres:postgres@localhost:5432/anonymous_survey"

# Test queries
SELECT * FROM surveys;
SELECT * FROM tokens;
```

### 2. Redis Testing
```bash
# Connect to Redis CLI
redis-cli

# Test Redis operations
> ping
> set test "hello"
> get test
> flushall  # Clear all data (for testing only)
```

### 3. Manual API Testing

#### 3.1 Admin Authentication
```bash
# Admin login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.edu",
    "password": "your_admin_password"
  }'

# Save the returned JWT token for subsequent requests
export JWT_TOKEN="your_jwt_token_here"
```

#### 3.2 Survey Management
```bash
# Create a survey
curl -X POST http://localhost:3000/api/surveys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "title": "Test Survey",
    "description": "Local testing survey",
    "question": "How do you rate this testing setup?"
  }'

# List all surveys
curl -X GET http://localhost:3000/api/surveys

# Get specific survey
curl -X GET http://localhost:3000/api/surveys/SURVEY_ID

# Get survey public keys
curl -X GET http://localhost:3000/api/surveys/SURVEY_ID/keys
```

#### 3.3 Token Management
```bash
# Generate tokens for students
curl -X POST http://localhost:3000/api/tokens/batch-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "surveyId": "SURVEY_ID",
    "students": [
      {"email": "student1@university.edu"},
      {"email": "student2@university.edu"}
    ]
  }'

# Validate a token
curl -X GET "http://localhost:3000/api/tokens/validate/TOKEN_VALUE?surveyId=SURVEY_ID"

# Mark token as used
curl -X POST http://localhost:3000/api/tokens/TOKEN_VALUE/use
```

#### 3.4 Cryptographic Operations
```bash
# Generate a commitment
curl -X POST http://localhost:3000/api/crypto/generate-commitment \
  -H "Content-Type: application/json" \
  -d '{
    "message": "This is my survey answer"
  }'

# Verify a commitment
curl -X POST http://localhost:3000/api/crypto/verify-commitment \
  -H "Content-Type: application/json" \
  -d '{
    "message": "This is my survey answer",
    "commitment": "generated_commitment_hex"
  }'
```

## API Testing Examples

### Using Postman Collection
Create a Postman collection with the following requests:

```json
{
  "info": {
    "name": "Anonymous Survey API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwt_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000/api"
    },
    {
      "key": "jwt_token",
      "value": ""
    },
    {
      "key": "survey_id",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Admin Login",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"admin@school.edu\",\n  \"password\": \"your_password\"\n}"
        },
        "url": "{{base_url}}/auth/login"
      }
    }
  ]
}
```

### Test Scripts
Create test scripts for common operations:

```bash
# File: test-scripts/test-survey-flow.sh
#!/bin/bash

BASE_URL="http://localhost:3000/api"
ADMIN_EMAIL="admin@school.edu"
ADMIN_PASSWORD="your_password"

echo "=== Testing Survey Flow ==="

# 1. Admin login
echo "1. Admin login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

JWT_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "JWT Token: $JWT_TOKEN"

# 2. Create survey
echo "2. Creating survey..."
SURVEY_RESPONSE=$(curl -s -X POST $BASE_URL/surveys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "title": "Automated Test Survey",
    "description": "Testing survey creation",
    "question": "How is the testing going?"
  }')

SURVEY_ID=$(echo $SURVEY_RESPONSE | jq -r '.id')
echo "Survey ID: $SURVEY_ID"

# 3. Generate tokens
echo "3. Generating tokens..."
curl -s -X POST $BASE_URL/tokens/batch-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"surveyId\": \"$SURVEY_ID\",
    \"students\": [
      {\"email\": \"test1@university.edu\"},
      {\"email\": \"test2@university.edu\"}
    ]
  }"

echo "=== Test Complete ==="
```

## Automated Testing

### Setup Jest Testing Framework
```bash
# Install Jest and testing dependencies
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest

# Create Jest configuration
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/generated/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
EOF
```

### Create Test Files
```typescript
// tests/setup.ts
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

beforeAll(async () => {
  // Setup test database
  await prisma.$connect();
});

afterAll(async () => {
  // Cleanup
  await prisma.$disconnect();
  await redis.disconnect();
});

beforeEach(async () => {
  // Clear test data before each test
  await prisma.$transaction([
    prisma.surveyResponse.deleteMany(),
    prisma.token.deleteMany(),
    prisma.surveyPrivateKey.deleteMany(),
    prisma.survey.deleteMany(),
  ]);
  await redis.flushall();
});
```

```typescript
// tests/auth.test.ts
import request from 'supertest';
import app from '../src/app';

describe('Authentication', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@school.edu',
          password: 'your_password'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
    });

    it('should reject invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@school.edu',
          password: 'wrong_password'
        })
        .expect(401);
    });
  });
});
```

```typescript
// tests/survey.test.ts
import request from 'supertest';
import app from '../src/app';

describe('Survey Management', () => {
  let authToken: string;

  beforeEach(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@school.edu',
        password: 'your_password'
      });
    
    authToken = loginResponse.body.token;
  });

  describe('POST /api/surveys', () => {
    it('should create a new survey', async () => {
      const response = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Survey',
          description: 'Test Description',
          question: 'Test Question?'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Test Survey');
      expect(response.body).toHaveProperty('blindSignaturePublicKey');
      expect(response.body).toHaveProperty('encryptionPublicKey');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/surveys')
        .send({
          title: 'Test Survey',
          description: 'Test Description',
          question: 'Test Question?'
        })
        .expect(401);
    });
  });
});
```

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts
```

## Load Testing

### Install Artillery for Load Testing
```bash
npm install -g artillery

# Create load test configuration
cat > load-test.yml << 'EOF'
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
  variables:
    surveyId: 'test-survey-id'

scenarios:
  - name: "Survey API Load Test"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "admin@school.edu"
            password: "your_password"
          capture:
            json: "$.token"
            as: "authToken"
      - get:
          url: "/api/surveys"
          headers:
            Authorization: "Bearer {{ authToken }}"
      - get:
          url: "/api/surveys/{{ surveyId }}/keys"
EOF

# Run load test
artillery run load-test.yml
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
npx prisma migrate reset
```

#### 2. Redis Connection Issues
```bash
# Check if Redis is running
docker-compose ps redis

# Test Redis connection
redis-cli ping

# Clear Redis data
redis-cli flushall
```

#### 3. Port Conflicts
```bash
# Check what's using port 3000
lsof -i :3000

# Kill process if needed
kill -9 PID

# Use different port
PORT=3001 npm run dev
```

#### 4. Environment Variable Issues
```bash
# Debug environment variables
node -e "console.log(process.env)" | grep -E "(DATABASE_URL|REDIS_URL|JWT_SECRET)"

# Reload environment
source .env
```

### Debugging Tips

#### 1. Enable Debug Logging
```bash
# Set debug environment variable
DEBUG=* npm run dev

# Or specific modules
DEBUG=express:* npm run dev
```

#### 2. Database Debugging
```bash
# Open Prisma Studio
npx prisma studio

# Generate and apply schema changes
npx prisma db push

# View current schema
npx prisma db pull
```

#### 3. API Response Debugging
```bash
# Use curl with verbose output
curl -v http://localhost:3000/api/surveys

# Use httpie for better formatting
http GET localhost:3000/api/surveys
```

### Test Data Management

#### Create Test Data Script
```typescript
// scripts/create-test-data.ts
import { PrismaClient } from '@prisma/client';
import { SurveyService } from '../src/services/survey.service';
import { TokenService } from '../src/services/token.service';

const prisma = new PrismaClient();
const surveyService = new SurveyService();
const tokenService = new TokenService();

async function createTestData() {
  try {
    console.log('Creating test survey...');
    const survey = await surveyService.createSurvey({
      title: 'Test Survey for Local Development',
      description: 'This is a test survey for local development',
      question: 'How satisfied are you with this testing setup?'
    });

    console.log(`Survey created with ID: ${survey.id}`);

    console.log('Creating test tokens...');
    const tokens = await tokenService.generateBatchTokens(survey.id, [
      { email: 'student1@test.edu' },
      { email: 'student2@test.edu' },
      { email: 'student3@test.edu' }
    ]);

    console.log(`Created ${tokens.length} tokens`);
    tokens.forEach((token, index) => {
      console.log(`Token ${index + 1}: ${token.token}`);
    });

    console.log('Test data created successfully!');
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
```

```bash
# Run test data creation
npx ts-node scripts/create-test-data.ts
```

This comprehensive testing guide should help you thoroughly test your server locally. The setup includes database and Redis with Docker, API testing examples, automated testing with Jest, and troubleshooting tips for common issues. 