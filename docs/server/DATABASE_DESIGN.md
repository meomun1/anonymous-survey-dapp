# Database Design: Anonymity Through Schema Separation

**Core Principle**: Physical separation of identity from responses

**Goal**: Even DB admin with full SQL access cannot link student identity to responses

---

## Design Philosophy

| Aspect | Traditional | This System |
|--------|-------------|-------------|
| **Schema** | responses has student_id FK | responses has NO student ID |
| **Query** | `SELECT ... WHERE student_id = X` ✓ | `JOIN` fails (no column) |
| **Anonymity** | Policy (promise not to query) | Schema prevents join |
| **Result** | "chooses not to link" | "cannot link" |

---

## Table Categories

**1. University Structure**: schools, teachers, courses, students, enrollments (NO relationship to responses)

**2. Campaign Management**: semesters, campaigns, surveys, questions, survey_assignments (survey_assignments links students to what to complete; survey_responses isolated)

**3. Cryptographic Operations**:
- **survey_tokens**: student_id, token_string, campaign_id, used, ticket_commitment (server knows student ↔ token, but blind sigs prevent token → submission link)
- **used_signatures**: signature_hash, signature_type, used, campaign_id (stores only hashes, no identity)

**4. Response Storage (Isolated)**:
- **survey_responses**: campaign_id, survey_id, encrypted_answer, commitment, submitted_at (NO student_id, NO FK, NO email)
- **response_commitments**: campaign_id, commitment, merkle_index, merkle_proof

**5. Participation Tracking**:
- **participation_claims**: student_id, campaign_id, receipt_hash, claimed_at (links student to participation, NOT responses; receipt signed with different blind factor)

---

## Anonymity Enforcement

### Mechanism 1: No Direct Relationships
**Invalid**: `SELECT r.answers FROM survey_responses r JOIN students s ON r.student_id = s.id WHERE s.email = 'alice'` ← Column doesn't exist!

### Mechanism 2: Signature Tracking Without Identity
Server knows "Signature ABC used" but CANNOT determine which student created it or which responses associated

### Mechanism 3: Separate Token/Receipt
Token flow: Stored with student_id → marked used (Phase 1)
Receipt flow: Generated randomly → signed (Phase 3, different blind factor) → claimed (Phase 4)
**Gap**: Cannot link token usage → receipt signature (crypto unlinkability)

### Mechanism 4: Delayed Timestamps
Submit at T → queue with random delay (1-5 min) → DB write at T + delay (breaks timing correlation)

---

## Data Flow Across Phases

| Phase | DB Writes | Identity Visible? | Critical Separation |
|-------|-----------|-------------------|---------------------|
| **1** | Mark token used, record sig hash | YES (server knows student) | - |
| **2** | None (offline) | NO | - |
| **3** | Store encrypted responses (NO student ID), commitments | NO (blind sig proves legitimacy only) | No link Phase 1 ↔ Phase 3 |
| **4** | Record participation, mark receipt used | YES (email provided) | Claim proves participation, not which responses |

See ANONYMOUS_SURVEY_WORKFLOW.md.

---

## Query Patterns

### Allowed
1. **Analytics**: `SELECT AVG(decrypted_rating) FROM survey_responses WHERE campaign_id = X` (aggregation only, no joins)
2. **Participation**: `SELECT s.email, CASE WHEN pc.id IS NOT NULL THEN 'Complete' ...` (binary status, no response access)
3. **Merkle Proof**: `SELECT merkle_proof FROM response_commitments WHERE commitment = 'abc'` (no auth needed)

### Prohibited
**Attempt**: `SELECT r.encrypted_answer FROM survey_responses r, students s WHERE ...`

**Why fails**: No column references students; join via submitted_at (random delay), campaign_id (large anonymity set), signature (unlinkable)

---

## Integrity Verification

**Commitment-Based**: Client sends `commitment = SHA256(plaintext)` + `ciphertext = RSA-OAEP(plaintext)` → server decrypts temporarily → checks `SHA256(decrypt(ciphertext)) == commitment` → stores ciphertext

**Merkle Tree**: response_commitments (leaves) + campaigns (root) + blockchain (immutable) → student computes root from commitment + proof → compares with blockchain

See BLOCKCHAIN_ARCHITECTURE.md.

---

## Transaction Management

| Transaction | Steps | Rollback |
|-------------|-------|----------|
| **Token Usage** | Check unused → Mark used → Record sig hash | Any failure → rollback |
| **Response Submission** | Verify sig → Decrypt/verify → Store + commitments → Mark sig used | Failure → nothing stored |
| **Participation Claim** | Verify receipt sig → Verify token → Record → Mark used | Failure → not recorded |

**ACID**: Atomicity, Consistency, Isolation, Durability

---

## Performance & Retention

**Indexing**: campaign_id, student_id, commitment (Merkle proofs)

**Retention**: Active (all), Completed (responses encrypted, tokens purged, claims retained), Archival (cold storage)

---

## Security Properties

| Property | Mechanism | Verification |
|----------|-----------|--------------|
| **DB Anonymity** | Schema separation (no FKs) | Schema inspection |
| **Replay Prevention** | used_signatures tracks hashes | Duplicate rejected |
| **Integrity** | Commitments + Merkle trees | Proof validation vs blockchain |

---

## Summary

Database achieves anonymity through:

1. **Physical Separation**: responses NO connection to students
2. **Signature Tracking**: Prevent replay without revealing identity
3. **Separate Token/Receipt**: Break linkage
4. **Delayed Timestamps**: Prevent timing correlation
5. **Commitments**: Detect tampering without plaintext
6. **ACID**: Consistent state

**Fundamental Difference**: Schema **prevents** linkage (not policy)

**Key Result**: Even DB admin with full SELECT cannot link student identities to responses (see PRIVACY_GUARANTEES.md)
