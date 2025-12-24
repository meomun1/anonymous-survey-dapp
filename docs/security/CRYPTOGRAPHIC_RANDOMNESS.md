# Cryptographic Randomness

**Purpose**: How randomness prevents correlation even with identical inputs

---

## Core Principle

**Question**: If Alice and Bob submit identical answers, why don't their cryptographic values match?

**Answer**: Five independent sources of randomness ensure different outputs for identical inputs

---

## Five Sources of Randomness

| Source | Size | Purpose | Effect | Security |
|--------|------|---------|--------|----------|
| **1. Token Generation** | 32 bytes | Unique identifier per student | Each student gets statistically unique token | 2^-256 collision probability |
| **2. Message Prep Prefix** | 32 bytes | Prevent dictionary attacks | Same commitment → Different prepared messages | Information-theoretic |
| **3. Blind Signature Factor** | 256 bytes | Achieve unlinkability (signing ↔ signature) | Server sees random value, cannot reverse | Computational (discrete log hard) |
| **4. PSS Salt** | 48 bytes | Probabilistic signatures prevent forgery | Same message signed twice → Different signatures | Provable under RSA assumption |
| **5. OAEP Encryption Seed** | 32 bytes | Semantic security for RSA | Same plaintext encrypted twice → Different ciphertexts | IND-CPA security |

**Total Fresh Randomness**: ~400 bytes per submission

**Sources**: OS CSPRNG (`crypto.randomBytes`), Web Crypto API (`crypto.getRandomValues`), RSABSSA library

---

## Layered Randomness Architecture

**Input**: Student's survey answer `"survey-cs101|CS101|teacher-001|54321"`

| Layer | Operation | Randomness | Output |
|-------|-----------|------------|--------|
| **1** | Commitment (Deterministic) | None | SHA-256(answer) → `c11c8acd...` |
| **2** | Prepare (Random prefix) | 32 bytes | `random_32_bytes + commitment` → 96 bytes |
| **3** | PSS Salt | 48 bytes | EMSA-PSS-ENCODE(prepared_msg, salt) → encoded_msg |
| **4** | Blinding | 256 bytes | `encoded_msg × r^e mod n` → blinded_msg (server sees this) |
| **5** | OAEP Seed | 32 bytes | RSA-OAEP(answer, seed) → encrypted_answer |

---

## Why Each Layer Is Necessary

| Layer | Attack | Defense | Why It Fails |
|-------|--------|---------|--------------|
| **Prepare Randomness** | Pre-compute hashes of all answer combinations | Random prefix makes dictionary impossible | Unpredictable prefix |
| **PSS Salt** | Exploit deterministic signature structure to forge | Probabilistic padding prevents forgery | Random salt each time |
| **Blinding Factor** | Link signing session to final signature | Unlinkability property of blind signatures | Cannot reverse blinding |
| **OAEP Seed** | Match encrypted responses to pre-computed values | Semantic security prevents pattern detection | Random seed each encryption |

---

## Security Properties

### Property 1: Indistinguishability
- **Definition**: Adversary cannot distinguish cryptographic values from different students
- **Guarantee**: Even identical inputs produce statistically independent outputs

### Property 2: Unlinkability
- **Definition**: Server cannot link Phase 1 (login) to Phase 3 (submission)
- **Mechanism**: Independent random blinding factors

### Property 3: Non-Repeatability
- **Definition**: Same operation twice produces different results
- **Examples**: Same message signed twice → Different signatures; same plaintext encrypted twice → Different ciphertexts

### Property 4: Forward Secrecy
- **Definition**: Past randomness cannot be reconstructed
- **Implementation**: Ephemeral random values (not stored)

---

## Randomness Quality Assurance

**Entropy Sources**: Hardware RNG (when available), system timing jitter, network timing

**Testing**: NIST Statistical Test Suite, Chi-square tests (uniformity), Autocorrelation tests

**Library Validation**:
- **@cloudflare/blindrsa-ts**: Production at Cloudflare, peer-reviewed, RFC-9474 test vectors
- **Web Crypto API**: W3C standard, browser vendor testing, FIPS 140-2 validated (some environments)

---

## Attack Resistance

| Attack | Method | Prevented By | Why It Fails |
|--------|--------|--------------|--------------|
| **Commitment Dictionary** | Pre-compute all possible answer hashes | Message preparation randomness | Random prefix unpredictable |
| **Signature Linkage** | Link blind signature session to final signature | Blinding factor randomness | Unlinkability property |
| **Ciphertext Pattern Matching** | Match encrypted responses to pre-encrypted values | OAEP seed randomness | Semantic security |
| **Timing Correlation** | Correlate login time with submission time | Server-side random delay | Unpredictable delay breaks correlation |

---

## Example: Alice and Bob Both Answer "54321"

**Without Randomness** (Insecure):
```
Alice commitment:  c11c8acd... (SAME)
Bob commitment:    c11c8acd... (SAME)
Alice signature:   266fc06a... (SAME)
Bob signature:     266fc06a... (SAME)
→ Server detects: "Two students gave identical answers"
→ Server can link: "These signatures belong to same pattern"
```

**With Randomness** (Secure):
```
Alice commitment:  c11c8acd... (SAME - deterministic)
Bob commitment:    c11c8acd... (SAME - deterministic)

Alice prepared:    d3cbb847... (DIFFERENT - random prefix)
Bob prepared:      269e99fa... (DIFFERENT - random prefix)

Alice signature:   266fc06a... (DIFFERENT - random salt + blinding)
Bob signature:     9a8b7c6d... (DIFFERENT - random salt + blinding)

→ Server sees: "Two completely unrelated submissions"
```

---

## Standards Compliance

| Standard | Components | Parameters |
|----------|------------|------------|
| **RFC-8017** (PKCS#1 v2.2) | RSA-PSS (random salt), RSA-OAEP (random seed), MGF1 | 48-byte salt, 32-byte seed |
| **RFC-9474** (Blind RSA) | Message prep (random prefix), blind signature protocol | RSABSSA-SHA384-PSS-Randomized, 32-byte prefix |
| **W3C Web Crypto** | `crypto.getRandomValues()` specification | RNG quality requirements, platform independence |

---

## Summary

Cryptographic randomness is the foundation of anonymity:

1. **Five Independent Sources**: Token, prepare prefix, PSS salt, blinding factor, OAEP seed
2. **Each Prevents Different Attack**: Dictionary, forgery, linkage, pattern matching
3. **Standards-Based**: RFC-8017, RFC-9474, W3C Web Crypto
4. **Production Quality**: Cloudflare library, OS-level CSPRNG
5. **Provable Security**: Information-theoretic and computational guarantees

**Key Insight**: Even identical inputs produce statistically independent outputs due to fresh randomness at each layer.
