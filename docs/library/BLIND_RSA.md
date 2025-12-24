# Blind RSA Signatures

**Standard**: RFC-9474 | **Library**: @cloudflare/blindrsa-ts | **Variant**: RSABSSA-SHA384-PSS-Randomized

---

## Purpose

Blind RSA signatures enable students to prove legitimacy without revealing identity. Server signs messages without seeing content, achieving **cryptographic unlinkability**.

---

## Core Concept

**Problem**: Traditional authentication links identity to action

**Solution**: Blind signatures break this linkage cryptographically

**Analogy**: Carbon paper envelope - student writes in sealed envelope with carbon paper, server signs outside (signature transfers), student opens with signed message, server cannot match to signing session

---

## How It Works

### Three-Phase Blind Signature Protocol

**Context Note**: This describes the **cryptographic blind signature operation** (blind → sign → unblind). The complete anonymous survey system uses a **four-phase workflow** (see ANONYMOUS_SURVEY_WORKFLOW.md):
1. Token Authentication (uses blind signature)
2. Survey Completion (offline)
3. Batch Submission + Receipt (uses different blind signature)
4. Participation Claim

---

**Phase 1: Blinding** (Client)
```
1. Client has message m
2. Generate random blinding factor r
3. Compute: m_blind = m × r^e mod n
4. Send m_blind to server
```

**Phase 2: Signing** (Server)
```
1. Server receives m_blind (looks random)
2. Sign: s_blind = (m_blind)^d mod n
3. Return s_blind to client
```

**Phase 3: Unblinding** (Client)
```
1. Remove blinding: s = s_blind × r^(-1) mod n
2. Result: s is valid RSA signature on m
3. Server never saw m
```

**Mathematical Proof**:
```
s = s_blind × r^(-1)
  = (m × r^e)^d × r^(-1)
  = m^d × r^(e×d) × r^(-1)
  = m^d  [because e×d ≡ 1 in RSA]
```

---

## Application in Survey System

### Dual Blind Signature Protocol

**First Signature: Token Authorization** (Phase 1)
- Input: Student's unique access token
- Blind: Random factor r₁
- Output: Authorization signature
- Purpose: Prove legitimate student without revealing which token

**Second Signature: Receipt Generation** (Phase 3)
- Input: Random receipt identifier
- Blind: Different random factor r₂
- Output: Receipt signature
- Purpose: Prove submission without linking to identity

**Critical Property**: Different blinding factors (r₁ ≠ r₂) make signatures unlinkable

---

## Security Properties

### 1. Unforgeability
**Property**: Only server with private key can produce valid signatures
**Basis**: RSA assumption (factoring hardness)

### 2. Blindness
**Property**: Server learns nothing about message
**Basis**: Random blinding factor is information-theoretically secure

### 3. Unlinkability
**Property**: Server cannot link signing sessions to final signatures
**Basis**: Computational hardness of reversing blinding

### 4. Correctness
**Property**: Final signature is valid standard RSA-PSS signature
**Basis**: Mathematical homomorphic property

---

## Randomization for Enhanced Security

**RSABSSA-SHA384-PSS-Randomized Variant**:
- Adds 32-byte random prefix to message before blinding
- Prevents replay attacks (same message → different signatures)
- RFC-9474 recommended variant

**Effect**: Even if two students have same token value (impossible by design), their signatures differ

---

## Attack Prevention

| Attack | Attempt | Prevention | Defense |
|--------|---------|------------|---------|
| **Replay** | Reuse token signature in Phase 3 | Token marked "used" after Phase 1 | DB state |
| **Linkage** | Link token sig to receipt sig | Different blinding factors (r₁ vs r₂) | Crypto hardness |
| **Forgery** | Create sig without server signing | Requires private key (factoring hard) | RSA assumption |

---

## Why Standard RSA Doesn't Work

**Standard RSA**: Client sends m → Server sees m (no privacy) → Server signs: s = m^d → Server logs: "Student X requested signature on Y" → **No anonymity**

**Blind RSA**: Client sends m_blind = m × r^e → Server sees random value → Server signs → Server cannot determine what was signed → **Complete anonymity**

---

## Integration with System

**Cryptographic Stack Layers**:
1. **Blind RSA Signatures** (this doc) - Unlinkability
2. **RSA-OAEP Encryption** - Response confidentiality
3. **SHA-256 Commitments** - Response integrity
4. **Merkle Trees** - Public verification

Each layer addresses different security goals.

---

## Standards Compliance

**RFC-9474**: RSA Blind Signatures (peer-reviewed protocol, known security properties, interoperability)

**NIST**: 2048-bit RSA (112-bit security level, approved until 2030)

**Hash Functions**: SHA-384 for blind signatures, SHA-256 for commitments

---

## Limitations

**Trusted Randomness**: Client must generate cryptographically secure random numbers

**Computational Assumption**: Security relies on RSA assumption (factoring infeasible)

**Honest Server**: Server must correctly implement blind signing protocol

---

## Summary

Blind RSA signatures achieve anonymity through:

1. **Mathematical Foundation**: RSA homomorphic property enables signing without seeing message
2. **Information-Theoretic Blinding**: Random factors make messages indistinguishable
3. **Computational Unlinkability**: Reversing blinding is computationally infeasible
4. **Dual Signatures**: Separate signatures for identity (token) and submission (receipt)
5. **Standards Compliance**: RFC-9474 provides peer-reviewed security guarantees

**Key Result**: Server **mathematically cannot** link responses to students, not merely **chooses not to**.
