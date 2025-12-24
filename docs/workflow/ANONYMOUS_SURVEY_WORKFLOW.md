# Anonymous Survey System Workflow

**Protocol**: Double Blind Signature with Dual Merkle Tree Verification

---

## Design Goals

1. **Anonymity**: Server cannot link student identity to responses
2. **Legitimacy**: Only enrolled students participate
3. **Integrity**: Responses cannot be tampered
4. **Verifiability**: Students prove inclusion
5. **Accountability**: Students claim participation

**Core Challenge**: Authenticate first → no anonymity OR submit anonymously → cannot verify

**Solution**: Blind signatures break this linkage cryptographically

---

## Four-Phase Protocol

| Phase | Purpose | Crypto Operation | Anonymity Mechanism |
|-------|---------|------------------|---------------------|
| **1** | Authentication | Blind RSA sig (token) | Server sees random blinded value |
| **2** | Survey completion | SHA-256 + RSA-OAEP | Offline; server learns nothing |
| **3** | Batch submission | Blind RSA sig (receipt) | Different blind factor (r₂ ≠ r₁) |
| **4** | Participation claim | Receipt sig verification | Independent timing |

### Phase Details

**Phase 1**: Enter token → blind (r₁) → server signs → unblind → auth signature saved
**Phase 2**: Answer questions → commit (SHA-256) → encrypt (RSA-OAEP) → store locally (offline)
**Phase 3**: Review → blind receipt (r₂) → submit with auth sig → server verifies → server decrypts (validates) → stores (no student ID) → server signs receipt → unblind → download proof file
**Phase 4**: Manually input email + prepared receipt + receipt sig → server verifies → records participation (email + campaign, NOT responses)

**Note**: Students manually input claim fields (no file upload) - see CLIENT_ARCHITECTURE.md

---

## Server Perspective

| Phase | Server Knows | Server Does NOT Know |
|-------|-------------|----------------------|
| **1** | Token X requested (email ↔ token) | - |
| **2** | Nothing (offline) | Progress, answers |
| **3** | Someone submitted valid responses | Which session → which submission, which email → which responses |
| **4** | Token X participated | Which submission → which claim, which email → which responses |

**Result**: DB admin cannot link student identity to responses (see PRIVACY_GUARANTEES.md)

---

## Privacy Guarantees

**Cryptographic Unlinkability**: Phase 1 ↔ Phase 3 (r₁ vs r₂ → information-theoretically unlinkable), Phase 3 ↔ Phase 4 (independent timing)

**Database Separation**: Three isolated tables - Tokens (email ↔ token ↔ campaign), Responses (encrypted + commitments, NO email/token), Claims (email ↔ campaign, NO responses)

**Critical**: Responses table has no FK to students (see DATABASE_DESIGN.md)

---

## Attack Prevention

| Attack | Prevention | Layer |
|--------|------------|-------|
| **Replay** | Signature tracking | DB state |
| **Forgery** | Requires RSA private key | Crypto hardness |
| **Linkage** | Different blind factors (r₁ vs r₂) | Blind sig unlinkability |
| **Survey Count Fraud** | Ticket commitment | SHA-256 verification |
| **Double Claim** | Receipt sig tracked | DB state |

See SECURITY_ANALYSIS.md.

---

## Ticket Commitment

**Purpose**: Enforce exact survey count

**How**: Server counts surveys → generates `SHA256({type: count})` → all students with same count get identical commitment → server verifies

**Privacy**: Anonymity set of 50-200 students with same count

---

## Blockchain Integration

| Tree | Contents | Purpose | Publication |
|------|----------|---------|-------------|
| **#1** | Response commitment hashes | Prove collection/unchanged | After submission closes |
| **#2** | Receipt signature hashes | Track participation | After claim closes |

**Why**: Immutability, transparency, cost efficiency (only 2 hashes on-chain), public verifiability

See BLOCKCHAIN_ARCHITECTURE.md.

---

## Campaign Lifecycle

**States**: Draft → Open → Launched → Closed → Published

**Flow**: Create → admin assigns/enrolls → launch (tokens) → student submission → publish Tree #1 → student claims → publish Tree #2 → close → analytics

**Note**: "Teachers Input" removed (admin handles all)

---

## vs Traditional Systems

| Aspect | Traditional | Our System |
|--------|------------|------------|
| **Approach** | Policy-based | Cryptographic |
| **Database** | responses has email | No email in responses |
| **Query** | `SELECT ... WHERE email = 'alice'` ✓ | `JOIN` fails (no column) |
| **Anonymity** | Chooses not to look | Mathematically cannot link |

**Critical Difference**: Server **cannot** link (not merely **chooses not to**)

---

## Summary

Four-phase protocol achieves:

1. **Cryptographic Anonymity**: Blind sigs with independent factors (r₁, r₂)
2. **Verifiable Legitimacy**: Only valid tokens can submit
3. **Response Integrity**: SHA-256 + Merkle trees detect tampering
4. **Public Transparency**: Blockchain verification without revealing data
5. **Practical Usability**: Multi-session support

**Key Innovation**: Independent blind signatures per phase → unlinkability even if one phase compromised
