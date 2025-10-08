# Anonymous Survey System - API Documentation

## Table of Contents
- [Quick API Reference](#quick-api-reference) ⚡
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URLs](#base-urls)
- [Common Response Formats](#common-response-formats)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [System Endpoints](#system-endpoints)
  - [Authentication Endpoints](#authentication-endpoints)
  - [Survey Management Endpoints](#survey-management-endpoints)
  - [Token Management Endpoints](#token-management-endpoints)
  - [Response Endpoints](#response-endpoints)
  - [Cryptographic Endpoints](#cryptographic-endpoints)
  - [Public Response Management Endpoints](#public-response-management-endpoints)
- [Request/Response Examples](#requestresponse-examples)
- [Rate Limiting](#rate-limiting)
- [Security Considerations](#security-considerations)

## Quick API Reference ⚡

**Jump to any endpoint quickly:**

### System (3 endpoints)
- `GET /health` - Server health check
- `GET /api-status` - API status overview
- `GET /api-docs` - Swagger documentation

### Authentication (2 endpoints)
- `POST /api/auth/login` - Admin login
- `POST /api/auth/refresh` - Refresh JWT token

### Survey Management (10 endpoints)
- `GET /api/surveys` - List all surveys
- `POST /api/surveys` - Create new survey (supports template system)
- `PUT /api/surveys/{id}` - Update survey
- `GET /api/surveys/{id}` - Get survey details
- `GET /api/surveys/{id}/stats` - Get survey statistics
- `GET /api/surveys/{id}/results` - Get published results with comprehensive analytics
- `GET /api/surveys/{id}/keys` - Get survey public keys
- `POST /api/surveys/{id}/process-responses` - Process blockchain responses and generate statistics
- `POST /api/surveys/{id}/publish-with-proof` - Publish survey results
- `DELETE /api/surveys/{id}` - Delete survey
- `GET /api/surveys/{id}/public-results` - Get curated public results

### Token Management (6 endpoints)
- `POST /api/tokens/batch-generate` - Generate student tokens
- `GET /api/tokens/validate/{token}` - Validate token
- `POST /api/tokens/{token}/use` - Mark token as used
- `POST /api/tokens/{token}/complete` - Mark token as completed
- `GET /api/tokens/survey/{surveyId}` - Get survey tokens
- `GET /api/tokens/test-email` - Test email service

### Response Management (7 endpoints)
- `POST /api/responses/blind-sign/{surveyId}` - Generate blind signature
- `POST /api/responses/submit-to-blockchain` - Submit to blockchain
- `POST /api/responses/decrypt-all/{surveyId}` - Decrypt all responses
- `GET /api/responses/survey/{surveyId}` - Get survey responses
- `GET /api/responses/commitment/{commitmentHash}` - Get by commitment hash
- `GET /api/responses/stats/{surveyId}` - Get response statistics
- `GET /api/responses/verify/{responseId}` - Verify response integrity

### Cryptographic Operations (6 endpoints)
- `POST /api/crypto/blind-sign/{surveyId}` - Generate blind signature
- `POST /api/crypto/verify-commitment` - Verify commitment
- `POST /api/crypto/decrypt-response` - Decrypt response
- `GET /api/crypto/public-keys/{surveyId}` - Get survey public keys
- `POST /api/crypto/generate-commitment` - Generate commitment
- `POST /api/crypto/bulk-verify-commitments` - Bulk verify commitments

### Public Response Management (5 endpoints)
- `GET /api/public-responses/survey/{surveyId}/selection` - Get responses for selection
- `POST /api/public-responses/survey/{surveyId}` - Update public responses
- `PUT /api/public-responses/survey/{surveyId}/visibility` - Toggle visibility
- `GET /api/public-responses/survey/{surveyId}/stats` - Get public statistics
- `GET /api/public-responses/survey/{surveyId}/public-results` - Get public results

**Total: 39 endpoints** | **Interactive Docs: `/api-docs`** | **Status: `/api-status`**

---

## Overview

The Anonymous Survey System API provides endpoints for managing surveys, tokens, responses, and cryptographic operations. The API uses JWT tokens for admin authentication and supports both REST and Swagger documentation.

**Interactive API Documentation**: Available at `/api-docs` when server is running.

## Authentication

Most admin endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Base URLs

- **Development**: `http://localhost:3000`
- **Production**: `https://your-server.com`

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## API Endpoints

### System Endpoints

#### Health Check
```http
GET /health
```
Returns server health status and Redis connection status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "server": "Anonymous Survey Server",
  "redis": "connected",
  "environment": "development"
}
```

#### API Status
```http
GET /api-status
```
Returns API status and available endpoints.

**Response:**
```json
{
  "status": "API is running",
  "endpoints": {
    "auth": "/api/auth",
    "surveys": "/api/surveys",
    "tokens": "/api/tokens",
    "crypto": "/api/crypto",
    "responses": "/api/responses",
    "publicResponses": "/api/public-responses"
  },
  "documentation": "/api-docs",
  "health": "/health"
}
```

#### API Documentation
```http
GET /api-docs
```
Swagger UI documentation interface.

---

### Authentication Endpoints

#### Admin Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "admin@school.edu",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Refresh Token
```http
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "token": "refresh-token-here"
}
```

**Response:**
```json
{
  "token": "new-access-token",
  "refreshToken": "new-refresh-token"
}
```

---

### Survey Management Endpoints

#### Get All Surveys
```http
GET /api/surveys
```
**Authentication:** Required

**Response:**
```json
[
  {
    "id": "survey_12345",
    "title": "Course Feedback Survey",
    "description": "Anonymous feedback for CS101",
    "question": "How would you rate this course?",
    "totalResponses": 25,
    "isPublished": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T15:45:00Z"
  }
]
```

#### Create Survey
```http
POST /api/surveys
```
**Authentication:** Required

**Request Body:**
```json
{
  "title": "Course Feedback Survey",
  "description": "Anonymous feedback for CS101",
  "templateId": "teaching_quality_25q"
}
```

**Note:** The system now supports template-based survey creation. When `templateId` is provided, the system automatically uses the pre-defined question set and sets `totalQuestions` accordingly.

**Response:**
```json
{
  "id": "survey_12345",
  "title": "Course Feedback Survey",
  "description": "Anonymous feedback for CS101",
  "question": "How would you rate this course?",
  "blindSignaturePublicKey": "base64-encoded-public-key",
  "encryptionPublicKey": "base64-encoded-public-key",
  "blockchainAddress": "blockchain-pda-address",
  "isPublished": false,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### Update Survey
```http
PUT /api/surveys/{id}
```
**Authentication:** Required

**Request Body:**
```json
{
  "title": "Updated Survey Title",
  "description": "Updated description",
  "question": "Updated question"
}
```

#### Get Survey Details
```http
GET /api/surveys/{id}
```

**Response:**
```json
{
  "id": "survey_12345",
  "title": "Course Feedback Survey",
  "description": "Anonymous feedback for CS101",
  "question": "How would you rate this course?",
  "totalResponses": 25,
  "isPublished": true,
  "blockchainAddress": "blockchain-pda-address",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### Get Survey Statistics
```http
GET /api/surveys/{id}/stats
```

**Response:**
```json
{
  "totalTokens": 50,
  "usedTokens": 25,
  "completedTokens": 25,
  "totalResponses": 25,
  "participationRate": 0.5,
  "completionRate": 1.0
}
```

#### Get Survey Results
```http
GET /api/surveys/{id}/results
```

**Response:**
```json
{
  "surveyId": "survey_12345",
  "title": "Course Feedback Survey",
  "totalResponses": 25,
  "isPublished": true,
  "publishedAt": "2024-01-20T15:45:00Z",
  "merkleRoot": "hex-encoded-merkle-root",
  "answerDistribution": {
    "Excellent": 8,
    "Good": 12,
    "Average": 4,
    "Poor": 1
  },
  "verificationData": {
    "commitmentHashes": ["hash1", "hash2", "..."],
    "blockchainAddress": "survey-pda-address"
  }
}
```

#### Get Survey Public Keys
```http
GET /api/surveys/{id}/keys
```

**Response:**
```json
{
  "blindSignaturePublicKey": "base64-encoded-blind-signature-public-key",
  "encryptionPublicKey": "base64-encoded-encryption-public-key"
}
```

#### Process Blockchain Responses
```http
POST /api/surveys/{id}/process-responses
```
**Authentication:** Required

**Purpose:** Process encrypted responses from the blockchain, decrypt them, and generate comprehensive statistics for analytics.

**Response:**
```json
{
  "success": true,
  "message": "Responses processed successfully",
  "processedCount": 25,
  "statistics": {
    "questionStatistics": {
      "1": {"1": 0, "2": 1, "3": 2, "4": 3, "5": 4},
      "2": {"1": 1, "2": 2, "3": 3, "4": 2, "5": 2}
    },
    "overallStatistics": {
      "averageScore": 4.2,
      "totalResponses": 25,
      "scoreDistribution": {"1": 2, "2": 3, "3": 5, "4": 8, "5": 7}
    }
  }
}
```

#### Publish Survey Results
```http
POST /api/surveys/{id}/publish-with-proof
```
**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Survey published successfully",
  "merkleRoot": "hex-encoded-merkle-root",
  "transactionSignature": "blockchain-transaction-signature"
}
```

#### Get Public Survey Results
```http
GET /api/surveys/{id}/public-results
```

**Response:**
```json
{
  "success": true,
  "data": {
    "survey": {
      "id": "survey_12345",
      "title": "Course Feedback Survey",
      "description": "Anonymous feedback for CS101",
      "question": "How would you rate this course?",
      "isPublished": true,
      "publishedAt": "2024-01-20T15:45:00Z"
    },
    "responses": [
      {
        "id": "response_1",
        "isPositive": true,
        "decryptedAnswer": "Excellent",
        "commitmentHash": "hash1",
        "publishedAt": "2024-01-20T15:45:00Z"
      }
    ],
    "stats": {
      "totalSelected": 10,
      "positiveCount": 7,
      "negativeCount": 3,
      "positiveRate": 0.7,
      "negativeRate": 0.3
    }
  }
}
```

#### Delete Survey
```http
DELETE /api/surveys/{id}
```
**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Survey deleted successfully"
}
```

---

### Token Management Endpoints

#### Generate Batch Tokens
```http
POST /api/tokens/batch-generate
```
**Authentication:** Required

**Request Body:**
```json
{
  "surveyId": "survey_12345",
  "students": [
    {"email": "student1@university.edu"},
    {"email": "student2@university.edu"}
  ]
}
```

**Response:**
```json
{
  "message": "Tokens generated and emails sent successfully",
  "count": 2,
  "emailsSent": 2,
  "emailsFailed": 0,
  "tokens": [
    {
      "token": "abc123def456",
      "email": "student1@university.edu"
    }
  ]
}
```

#### Validate Token
```http
GET /api/tokens/validate/{token}?surveyId={surveyId}
```

**Response:**
```json
{
  "valid": true,
  "token": "abc123def456",
  "surveyId": "survey_12345",
  "studentEmail": "student1@university.edu",
  "isCompleted": false
}
```

#### Mark Token as Used
```http
POST /api/tokens/{token}/use
```

**Response:**
```json
{
  "id": "token_id",
  "token": "abc123def456",
  "used": true,
  "usedAt": "2024-01-15T10:30:00Z"
}
```

#### Mark Token as Completed
```http
POST /api/tokens/{token}/complete
```

**Response:**
```json
{
  "id": "token_id",
  "token": "abc123def456",
  "isCompleted": true,
  "completedAt": "2024-01-15T10:30:00Z"
}
```

#### Get Survey Tokens
```http
GET /api/tokens/survey/{surveyId}
```
**Authentication:** Required

**Response:**
```json
[
  {
    "id": "token_id",
    "token": "abc123def456",
    "studentEmail": "student1@university.edu",
    "used": true,
    "isCompleted": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

#### Test Email Service
```http
GET /api/tokens/test-email
```
**Authentication:** Required

**Response:**
```json
{
  "available": true,
  "smtpTested": true,
  "message": "Email service is working correctly"
}
```

---

### Response Endpoints

#### Generate Blind Signature (Response Flow)
```http
POST /api/responses/blind-sign/{surveyId}
```

**Request Body:**
```json
{
  "blindedMessage": "base64-encoded-blinded-message"
}
```

**Response:**
```json
{
  "blindSignature": "base64-encoded-blind-signature"
}
```

#### Submit Response to Blockchain
```http
POST /api/responses/submit-to-blockchain
```

**Request Body:**
```json
{
  "surveyId": "survey_12345",
  "commitment": "hex-encoded-commitment-hash",
  "encryptedAnswer": "base64-encoded-encrypted-answer"
}
```

**Response:**
```json
{
  "transactionSignature": "blockchain-transaction-signature"
}
```

#### Decrypt All Responses
```http
POST /api/responses/decrypt-all/{surveyId}
```
**Authentication:** Required

**Response:**
```json
{
  "processedResponses": 25,
  "responses": [
    {
      "decryptedAnswer": "Excellent",
      "commitmentHash": "hash1"
    }
  ]
}
```

#### Get Survey Responses
```http
GET /api/responses/survey/{surveyId}
```
**Authentication:** Required

**Response:**
```json
[
  {
    "id": "response_id",
    "surveyId": "survey_12345",
    "decryptedAnswer": "Excellent",
    "commitmentHash": "hash1",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

#### Get Response by Commitment Hash
```http
GET /api/responses/commitment/{commitmentHash}
```

**Response:**
```json
{
  "id": "response_id",
  "surveyId": "survey_12345",
  "decryptedAnswer": "Excellent",
  "commitmentHash": "hash1"
}
```

#### Get Response Statistics
```http
GET /api/responses/stats/{surveyId}
```

**Response:**
```json
{
  "totalResponses": 25,
  "answerDistribution": {
    "Excellent": 8,
    "Good": 12,
    "Average": 4,
    "Poor": 1
  }
}
```

#### Verify Response Integrity
```http
GET /api/responses/verify/{responseId}
```

**Response:**
```json
{
  "isValid": true,
  "commitmentHash": "expected-hash"
}
```

---

### Cryptographic Endpoints

#### Generate Blind Signature
```http
POST /api/crypto/blind-sign/{surveyId}
```

**Request Body:**
```json
{
  "blindedMessage": "base64-encoded-blinded-message"
}
```

**Response:**
```json
{
  "blindSignature": "base64-encoded-blind-signature"
}
```

#### Verify Commitment
```http
POST /api/crypto/verify-commitment
```

**Request Body:**
```json
{
  "message": "Excellent",
  "commitment": "a1b2c3d4e5f6..."
}
```

**Response:**
```json
{
  "isValid": true
}
```

#### Decrypt Response
```http
POST /api/crypto/decrypt-response
```
**Authentication:** Required

**Request Body:**
```json
{
  "surveyId": "survey_12345",
  "encryptedAnswer": "base64-encoded-encrypted-answer"
}
```

**Response:**
```json
{
  "decryptedAnswer": "Excellent"
}
```

#### Get Survey Public Keys
```http
GET /api/crypto/public-keys/{surveyId}
```

**Response:**
```json
{
  "blindSignaturePublicKey": "base64-encoded-rsa-public-key",
  "encryptionPublicKey": "base64-encoded-rsa-public-key"
}
```

#### Generate Commitment
```http
POST /api/crypto/generate-commitment
```

**Request Body:**
```json
{
  "message": "Excellent"
}
```

**Response:**
```json
{
  "commitment": "a1b2c3d4e5f6..."
}
```

#### Bulk Verify Commitments
```http
POST /api/crypto/bulk-verify-commitments
```

**Request Body:**
```json
{
  "commitments": ["a1b2c3d4e5f6...", "b2c3d4e5f6a1..."]
}
```

**Response:**
```json
{
  "merkleRoot": "hex-encoded-merkle-root"
}
```

---

### Public Response Management Endpoints

#### Get Responses for Admin Selection
```http
GET /api/public-responses/survey/{surveyId}/selection
```
**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "response_1",
      "decryptedAnswer": "Excellent",
      "commitmentHash": "hash1",
      "createdAt": "2024-01-15T10:30:00Z",
      "isPublic": false,
      "isPositive": null
    }
  ]
}
```

#### Update Public Responses
```http
POST /api/public-responses/survey/{surveyId}
```
**Authentication:** Required

**Request Body:**
```json
{
  "items": [
    {
      "responseId": "response_1",
      "isPositive": true
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Public responses updated successfully"
}
```

#### Toggle Public Survey Visibility
```http
PUT /api/public-responses/survey/{surveyId}/visibility
```
**Authentication:** Required

**Request Body:**
```json
{
  "isPublicEnabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Public visibility updated successfully"
}
```

#### Get Public Response Statistics
```http
GET /api/public-responses/survey/{surveyId}/stats
```
**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSelected": 10,
    "positiveCount": 7,
    "negativeCount": 3,
    "positiveRate": 0.7,
    "negativeRate": 0.3
  }
}
```

---

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
  -d '{"title":"Course Feedback","description":"CS101","templateId":"teaching_quality_25q"}' | jq -r '.id')

# 3. Generate Tokens
curl -X POST http://localhost:3000/api/tokens/batch-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"surveyId":"'"$SURVEY_ID"'","students":[{"email":"student@university.edu"}]}'
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Window**: 15 minutes
- **Limit**: 100 requests per window per IP
- **Headers**: Rate limit information included in response headers

## Security Considerations

1. **JWT Tokens**: Use HTTPS in production
2. **Rate Limiting**: Applied to all API endpoints
3. **Input Validation**: All inputs are validated and sanitized
4. **CORS**: Configured for specific origins
5. **Helmet**: Security headers enabled
6. **Private Keys**: Stored encrypted in database

---

## Interactive Documentation

For interactive API testing and exploration, visit:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **API Status**: `http://localhost:3000/api-status`
- **Health Check**: `http://localhost:3000/health`

---

*Last updated: January 2024*
