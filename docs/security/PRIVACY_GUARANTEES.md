# Privacy Guarantees

**Purpose**: Server information visibility analysis across workflow phases

**Core Question**: What can malicious DB admin with full access determine?

**Answer**: Admin sees responses exist but **cannot link** specific students to specific responses

---

## Information Visibility Per Phase

| Phase | Server SEES | Server CANNOT SEE |
|-------|-------------|-------------------|
| **1: Login** | Token string, student email, campaign ID, survey count, blinded token (random), timestamp | Actual token during blinding, final signature (unblinded client-side), which specific surveys |
| **2: Completion** | **Nothing** (offline) | Answers, progress, time spent, completion time |
| **3: Submission** | Authorization sig (unlinkable to Phase 1), ticket commitment (shared), encrypted responses, commitments, blinded receipt | Which student submitted, which token used, correlation with Phase 1 |
| **4: Claim** | Receipt sig (unlinkable to Phase 3), email, campaign ID | Which responses belong to student, connection Phase 1 ↔ Phase 3 |

---

## What Server Can vs Cannot Do

### Phase 3: Submission Analysis

**Server CAN**: Verify auth sig valid, check ticket commitment matches count, decrypt responses (temp validation), verify commitments, store + sign blinded receipt

**Server CANNOT**: Link auth sig to student (blind sig unlinkability), determine which student submitted (ticket shared), correlate with token (crypto guarantee), match timing (random delay)

---

## Database Schema Separation

### Three Isolated Tables

**survey_tokens**: Token, student email, campaign, completion status (MISSING: responses, answers, commitments)

**survey_responses**: Response ID, campaign, commitment, encrypted/decrypted data (MISSING: student_email, token, ANY student identifier; NO foreign key)

**used_submission_signatures**: Signature ID, prepared token, token sig, campaign (MISSING: student_email, decrypted responses)

### Impossibility of Joining

**Attempt**: `SELECT t.student_email, r.decrypted_data FROM survey_tokens t JOIN survey_responses r ON ???` ← No join condition exists!

**Alternative Attempts**: Timing (random delay breaks), campaign_id (many students), signatures (unlinkable)

---

## Unlinkability Proofs

### Phase 1 → Phase 3 Unlinkability

**Server Has**: Phase 1 token `7240708f...` belongs to Alice, Phase 3 auth sig `0cd88f87...` used

**Attack**: Determine if sig came from token

**Why Fails**: Reversing blind sig requires solving discrete log (computationally infeasible for 2048-bit RSA)

**Conclusion**: **Cannot link** (cryptographic guarantee)

### Phase 3 → Phase 4 Unlinkability

**Server Has**: Phase 3 receipt sig issued, Phase 4 Alice claims with receipt sig

**Why Fails**: Receipt sig different from auth sig, no DB link between submission and receipt, timing unpredictable, multiple students claim in batches

**Conclusion**: **Cannot link** (DB separation + timing)

### Email → Responses Unlinkability

**Attack**: `SELECT r.* FROM survey_tokens t JOIN survey_responses r ON ??? WHERE t.student_email = 'alice@...'`

**Why Fails**: No common column (by design)

**Conclusion**: **Cannot link** (schema design)

---

## Privacy Guarantees Summary

| Guarantee | Mechanism | Strength |
|-----------|-----------|----------|
| **Identity-Response Separation** | DB schema separation + blind sig unlinkability | Cryptographic + architectural |
| **Timing Resistance** | Random delay (1-5 min) | Statistical (reduces correlation to noise) |
| **Ticket Anonymity** | SHA-256 deterministic (same for same count) | Mathematical; anonymity set: 50-200 |
| **IP Anonymity** | Mixing proxy (all from same IP) | Infrastructure |
| **Forward Secrecy** | Ephemeral blinding factors (not stored) | Temporal |

---

## Malicious Administrator Capabilities

### Administrator CAN Determine:
1. Which students assigned tokens
2. How many students completed surveys
3. Total number of responses
4. All survey answers (after decryption)
5. Response distribution (counts per answer)
6. Which courses evaluated

### Administrator CANNOT Determine:
1. Which specific student gave which specific answer
2. Alice's rating for Professor Smith
3. Correlation between students and critical feedback
4. Which of 200 responses belongs to specific email
5. Temporal correlation (random delay breaks)
6. Network source (proxy hides IPs)

---

## Comparison: Traditional vs Cryptographic

| Aspect | Traditional "Anonymous" | Our System |
|--------|------------------------|------------|
| **Schema** | responses has student_email | No student ID in responses |
| **Privacy Model** | Policy (promise not to look) | Crypto + architectural (mathematically unlinkable) |
| **Attack Surface** | One SQL query reveals all | No SQL query can link |
| **Trust** | Must trust admins follow policy | Crypto guarantee (cannot link even if malicious) |
| **Linkage** | `SELECT ... WHERE student_email` ✓ | `JOIN` fails (no column) |

---

## Summary

Privacy achieved through four layers:

1. **Cryptographic**: Blind sigs prevent linking sigs to students (see BLIND_RSA.md)
2. **Database**: Schema separation prevents joining identities with responses
3. **Infrastructure**: Mixing proxy + random delays prevent correlation (see SECURITY_ANALYSIS.md)
4. **Temporal**: Unpredictable timing breaks time-based attacks

**Result**: Even malicious admin with full SQL access, private keys, source code, infrastructure control **cannot determine** which student submitted which responses.

**Key Difference**: Server **mathematically and architecturally cannot** link responses to students, not merely **chooses not to**.
