# Randomness Analysis Summary
## For Anonymous Survey System - Professor Review

**Date**: 2025-12-01
**Purpose**: Explain why cryptographic values differ even with identical inputs
**Audience**: Academic review / Professor evaluation

---

## Executive Summary

Even when two students submit **identical survey answers**, all cryptographic values in the system are **different**. This document explains the 5 sources of randomness that ensure privacy and security.

### Quick Answer: What's Same vs Different?

| Variable | Same or Different? | Why? |
|----------|-------------------|------|
| `answerString` | ✅ **SAME** | Both students gave identical ratings |
| `commitment` (SHA-256) | ✅ **SAME** | Deterministic hash function |
| `token` | ❌ **DIFFERENT** | Random 32-byte identifier |
| `preparedMsg` | ❌ **DIFFERENT** | 32-byte random prefix added |
| `inv` (blinding factor) | ❌ **DIFFERENT** | Random blinding value |
| `blindedMsg` | ❌ **DIFFERENT** | Depends on random blinding factor |
| `blindSignature` | ❌ **DIFFERENT** | Depends on random salt + blinding |
| `signature` (final) | ❌ **DIFFERENT** | Depends on all random layers |
| `encryptedAnswer` | ❌ **DIFFERENT** | Random OAEP padding |

---

## The 5 Sources of Randomness

### 1. **Token Generation** - Student Identifier
```javascript
const token = crypto.randomBytes(32).toString('hex');
```

**What**: 32 random bytes → 64 hex characters
**Source**: Node.js CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
**Purpose**: Unique identifier for each student
**Size**: 32 bytes (256 bits)

**Example**:
- Token 1: `4482ec17c1b50f9c32bbaa4dd873fdd8...`
- Token 2: `4fbabde191e85ea76d27313f1cf26b38...`

---

### 2. **Prepare() Method** - Random Prefix in Message

**Library**: `@cloudflare/blindrsa-ts`
**Code Location**: `blindrsa.js` line 29-32

```javascript
prepare(msg) {
    const msg_prefix_len = 32;  // For Randomized mode
    const msg_prefix = crypto.getRandomValues(new Uint8Array(32));
    return [msg_prefix, msg];  // Concatenate
}
```

**What**: Adds 32 random bytes as prefix to commitment
**Source**: Web Crypto API `crypto.getRandomValues()`
**Purpose**: Prevents "commitment dictionary" attack
**Formula**: `preparedMsg = [32 random bytes] + commitment`

**Privacy Benefit**: Server cannot build dictionary of common answer combinations

---

### 3. **Blind Signature** - Random Blinding Factor (inv)

**Library**: `@cloudflare/blindrsa-ts`
**Code Location**: `blindrsa.js` line 74-92, `util.js` line 233-242

```javascript
// Generate random blinding factor
const r = random_integer_uniform(n, kLen);

// Inside random_integer_uniform():
const r = os2ip(crypto.getRandomValues(new Uint8Array(kLen)));
```

**What**: Generates random integer `r` where `1 <= r < n` (n = RSA modulus)
**Source**: Web Crypto API `crypto.getRandomValues()`
**Purpose**: Provides unlinkability between blind signature request and final signature
**Size**: ~256 bytes (2048-bit RSA modulus)

**Mathematical Process**:
1. Generate random `r`
2. Compute `inv = r^(-1) mod n` (modular inverse)
3. Compute `x = r^e mod n` (raise to public exponent)
4. Compute `blindedMsg = m * x mod n` (blind the message)

**Privacy Benefit**: Server cannot link `blindedMsg` to final signature

---

### 4. **PSS Salt** - Probabilistic Signature Scheme

**Standard**: RSA-PSS (PKCS#1 v2.1, RFC 8017)
**Code Location**: Inside `emsa_pss_encode()` in blind signature library

```
EMSA-PSS-ENCODE Algorithm:
1. mHash = Hash(M)
2. salt = random(48)        ← 48 random bytes!
3. M' = [8 zeros] || mHash || salt
4. H = Hash(M')
5. ... (mask generation and encoding)
```

**What**: Adds 48 random bytes as salt before signing
**Source**: Web Crypto API `crypto.getRandomValues()`
**Purpose**: Prevents signature forgery attacks
**Size**: 48 bytes (for SHA-384 hash)

**Security Benefit**: Same message → different signatures (probabilistic)

---

### 5. **RSA-OAEP Padding** - Encryption Randomness

**Standard**: RSA-OAEP (PKCS#1 v2.1, RFC 8017)
**Code Location**: Built into Web Crypto API `crypto.subtle.encrypt()`

```
OAEP Encoding Algorithm:
1. seed = random(32)        ← 32 random bytes!
2. DB = lHash || PS || 0x01 || M
3. dbMask = MGF(seed, ...)
4. maskedDB = DB ⊕ dbMask
5. ... (seed masking and encoding)
```

**What**: Adds 32 random bytes as seed before encryption
**Source**: Web Crypto API (browser/Node.js crypto)
**Purpose**: Provides semantic security (IND-CPA)
**Size**: 32 bytes (for SHA-256 hash)

**Security Benefit**: Same plaintext → different ciphertext every time

---

## Visual Flow: Layered Randomness

```
Student's Answer: "survey-cs101|CS101|teacher-001|54321"
                                    ↓
                    commitment = SHA256(answer) ← Deterministic
                                    ↓
      preparedMsg = [32 random bytes] + commitment ← Layer 1: Random prefix
                                    ↓
      encoded_msg = EMSA_PSS(preparedMsg + 48-byte salt) ← Layer 2: PSS salt
                                    ↓
         blindedMsg = encoded_msg * r^e mod n ← Layer 3: Random blinding factor
                                    ↓
      blindSignature = (blindedMsg)^d mod n ← Server signs (depends on all layers)
                                    ↓
         signature = blindSig * inv mod n ← Final signature (depends on all layers)

Parallel Process:
      encryptedAnswer = RSA_OAEP_Encrypt(answer + 32-byte seed) ← Layer 4: OAEP seed
```

---

## Summary Table: Randomness Sources

| Variable | Random Source | Size | API Used | Purpose |
|----------|--------------|------|----------|---------|
| `token` | Fresh random bytes | 32 bytes | `crypto.randomBytes()` | Unique student ID |
| `preparedMsg` prefix | Fresh random bytes | 32 bytes | `crypto.getRandomValues()` | Anti-dictionary attack |
| PSS salt | Fresh random bytes | 48 bytes | `crypto.getRandomValues()` | Anti-forgery |
| Blinding factor `r` | Fresh random bytes | ~256 bytes | `crypto.getRandomValues()` | Unlinkability |
| OAEP seed | Fresh random bytes | 32 bytes | `crypto.subtle.encrypt()` | Semantic security |

**Total Random Data Per Submission**: ~390 bytes of fresh randomness

---

## Why So Much Randomness?

Each layer serves a **different security purpose**:

1. **preparedMsg randomness** → Prevents commitment dictionary attack
   - Without it: Server could pre-compute hashes of common answers

2. **PSS salt randomness** → Prevents signature forgery
   - Without it: Attacker could forge signatures via chosen-message attacks

3. **Blinding factor randomness** → Provides unlinkability
   - Without it: Server could link blind signature request to final signature

4. **OAEP seed randomness** → Provides semantic security
   - Without it: Server could detect identical encrypted answers

**All layers are necessary and follow cryptographic standards (RFC 8017).**

---

## Privacy Guarantee

Even if Alice and Bob submit **identical answers**:

✅ **Server sees**:
- Different `blindedMsg` (cannot detect same commitment)
- Different signatures (PSS salt + blinding factor differ)
- Different encrypted answers (OAEP seed differs)

❌ **Server CANNOT**:
- Link students to their specific answers
- Build a dictionary to guess answers
- Correlate blind signature requests with final submissions

---

## Cryptographic Standards Referenced

All randomness sources follow established cryptographic standards:

1. **RSA-BSSA**: Blind RSA Signature Scheme with Appendix
   - RFC Draft: https://datatracker.ietf.org/doc/draft-irtf-cfrg-rsa-blind-signatures/
   - Library: `@cloudflare/blindrsa-ts` (Cloudflare implementation)

2. **RSA-PSS**: Probabilistic Signature Scheme
   - RFC 8017 (PKCS#1 v2.2): https://www.rfc-editor.org/rfc/rfc8017

3. **RSA-OAEP**: Optimal Asymmetric Encryption Padding
   - RFC 8017 (PKCS#1 v2.2): https://www.rfc-editor.org/rfc/rfc8017

4. **Web Crypto API**: Standard browser/Node.js cryptography
   - W3C Specification: https://www.w3.org/TR/WebCryptoAPI/

---

## Running the Analysis

To see the full analysis with live demonstrations:

```bash
cd protocol
npx ts-node src/workflow-data-table.ts
```

This will show:
- Complete workflow data tables
- Live randomness demonstrations
- Source code from blind signature library
- Mathematical explanations

---

## Key Takeaway for Professor

**Question**: "Why are cryptographic values different even with identical inputs?"

**Answer**: The system uses **5 independent sources of randomness** at different layers, each serving a specific security purpose:
1. Student identification (token)
2. Anti-dictionary attack (preparedMsg prefix)
3. Anti-forgery (PSS salt)
4. Unlinkability (blinding factor)
5. Semantic security (OAEP seed)

This multi-layered randomness ensures that **privacy is preserved** even when students submit identical answers, following established cryptographic standards (RFC 8017, RSABSSA).

---

**Document Status**: Ready for Academic Review
**Technical Depth**: Source code analysis + Mathematical explanation
**Verification**: Can be reproduced by running `workflow-data-table.ts`
