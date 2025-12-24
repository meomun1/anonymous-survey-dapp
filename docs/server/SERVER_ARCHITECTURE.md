# Server Architecture

**Purpose**: Central coordinator for anonymous survey system

---

## Overview

Server manages: university structure, campaign lifecycle, cryptographic operations, blockchain integration, analytics

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Runtime** | Node.js + TypeScript | Asynchronous I/O, type safety |
| **Framework** | Express.js | RESTful API, middleware |
| **Database** | PostgreSQL | ACID transactions, schema isolation |
| **Cache** | Redis | Sessions, rate limiting, job queue (timing mitigation) |
| **Blockchain** | Solana Web3.js + Anchor | Smart contract interaction |

---

## Architecture Layers

**Layer 1: Routes** - University mgmt, campaign mgmt, crypto ops, submission, analytics, verification, blockchain

**Layer 2: Controllers** - HTTP logic, orchestrate services (thin orchestrators)

**Layer 3: Services**

| Service | Responsibilities |
|---------|------------------|
| **Campaign** | Creation + RSA key gen, state transitions, token generation |
| **Crypto** | Blind signatures, RSA-OAEP, commitment verification |
| **Merkle** | Tree construction, root calculation, proof generation |
| **Blockchain** | Campaign publishing, Merkle roots (Tree #1, #2), finalization |
| **Token** | 32-byte token generation, distribution, validation, ticket commitment |
| **Response** | Submission processing, commitment storage, auth verification |
| **Analytics** | Statistics, teacher performance (anonymous), student tracking (participation only) |

**Layer 4: Database** - Physical separation (responses has NO student ID), no FKs, ACID (see DATABASE_DESIGN.md)

**Layer 5: Integrations** - Blockchain (Solana RPC), Email (token distribution)

---

## Request Flow (Four Phases)

| Phase | Flow | Key Point |
|-------|------|-----------|
| **1** | Blinded token → validate → sign → mark used | Server never sees actual token |
| **2** | None (offline) | No server communication |
| **3** | Encrypted responses + auth sig + blinded receipt → verify → decrypt (validate) → store (no student ID) → sign receipt | Responses stored without student ID |
| **4** | Receipt sig + email → verify → lookup token → record participation (email + campaign, NO responses) | Knows participation, cannot link to responses |

See ANONYMOUS_SURVEY_WORKFLOW.md for protocol.

---

## Security

**Authentication**: Admin/Teacher (session-based RBAC), Student (one-time tokens + blind signatures)

**Authorization (RBAC)**: Super Admin (full), School Admin (school ops), Teacher (read-only), Student (anonymous survey)

**Important**: Teachers no longer manage data (admin handles all)

**Anonymity Enforcement**:
- **Technical**: DB schema prevents linkage, blind signatures (unlinkability), random delays (1-5 min), IP anonymization
- **Organizational**: Audit logging, policy restrictions, infrastructure separation

See SECURITY_ANALYSIS.md.

---

## Scalability & Performance

**Horizontal**: Stateless API (Redis for shared state), load balancer, connection pooling

**Performance**: Redis cache (metadata, public keys), background jobs (delays, Merkle computation, async email), query optimization (selective columns, aggregates, pagination)

---

## Campaign Lifecycle

**States**: Draft → Open → Launched → Closed → Published

**Transitions**: Admin completes assignments → generate/email tokens → students submit → publish Tree #1 → students claim → publish Tree #2 (irreversible)

**Important**: "Teachers Input" state removed (admin handles all data)

**Multi-Campaign**: Concurrent campaigns with unique keys and blockchain accounts

---

## Data Flow

**Write**: Campaign creation (RSA pair) → Token generation (32-byte + ticket commitment) → Response submission (verify → decrypt (validate) → store encrypted) → Merkle publishing (build tree → compute root → blockchain → Published state)

**Read**: Analytics (aggregated only, no joins to students) → Merkle proof (locate → compute siblings → return) → Participation (join tokens + claims → binary status)

---

## Error Handling

| Category | Examples | HTTP |
|----------|----------|------|
| **Client** | Invalid token, used sig, malformed | 4xx |
| **Server** | Crypto failure, DB failure, blockchain error | 5xx |

**Idempotency**: Tracked, duplicates return cached

**Retry**: Blockchain transactions, email, external APIs

---

## Summary

Server architecture achieves anonymous yet verifiable surveys through:

1. **Layered Design**: Routes → Controllers → Services → Database
2. **Cryptographic Services**: Blind signatures (auth without identity)
3. **Database Isolation**: Schema separation prevents identity-response linkage
4. **Blockchain Integration**: Immutable Merkle roots for public verification
5. **Scalability**: Stateless design supports horizontal scaling

**Key Result**: Server **cannot** link student identities to responses (cryptographic + database separation).
