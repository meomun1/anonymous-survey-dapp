# Cryptographic Libraries

**Purpose**: Overview of cryptographic libraries and parameter choices

---

## Library Stack

| Library | Purpose | Operations | Why Chosen |
|---------|---------|------------|------------|
| **@cloudflare/blindrsa-ts** | Blind RSA signatures (RFC-9474) | Message preparation, blinding/unblinding, signing | Production-tested, RFC-compliant, TypeScript native |
| **Web Crypto API** | Browser cryptography | RSA-OAEP, SHA-256, CSPRNG | Native support, hardware acceleration, W3C standard |
| **Node.js Crypto** | Server cryptography | Token generation, hashing, key operations | Server environment, OpenSSL-backed |

---

## Cryptographic Primitives

### RSA-OAEP (Response Encryption)
**Standard**: RFC-8017 (PKCS#1 v2.2)
**Parameters**: 2048-bit keys, SHA-256 hash, MGF1 with SHA-256
**Security**: IND-CPA (semantic security)
**Purpose**: Encrypt survey responses; only admin can decrypt

### SHA-256 (Commitments)
**Standard**: NIST FIPS 180-4
**Parameters**: 256-bit output, 128-bit collision resistance
**Purpose**: Generate response commitments and Merkle tree leaves

### SHA-384 (Blind Signatures)
**Standard**: NIST FIPS 180-4
**Parameters**: 384-bit output, used in RSA-PSS padding
**Purpose**: Hash function for RSABSSA variant

### Blind RSA (RSABSSA-SHA384-PSS-Randomized)
**Standard**: RFC-9474
**Parameters**: 2048-bit keys, SHA-384, 32-byte random prefix
**Purpose**: Cryptographic unlinkability between phases (see BLIND_RSA.md)

---

## Security Parameters

| Parameter | Size | Security Level | Purpose |
|-----------|------|----------------|---------|
| **RSA Modulus** | 2048 bits | 112-bit | NIST approved until 2030 |
| **Blinding Factor** | 256 bytes | Statistical indistinguishability | Matches RSA modulus |
| **Random Prefix** | 32 bytes | Prevents dictionary attacks | RFC-9474 requirement |
| **PSS Salt** | 48 bytes | Matches SHA-384 | RFC-8017 recommendation |

---

## Standards Compliance

| Component | Standard | Purpose |
|-----------|----------|---------|
| Blind Signatures | RFC-9474 | RSA Blind Signature Algorithm |
| RSA-OAEP | RFC-8017 | Encryption with padding |
| RSA-PSS | RFC-8017 | Probabilistic signature scheme |
| SHA-256 | FIPS 180-4 | Hashing for commitments |
| SHA-384 | FIPS 180-4 | Hashing for signatures |
| Web Crypto | W3C Standard | Browser cryptography API |

---

## Random Number Generation

**Client**: `crypto.getRandomValues()` (Web Crypto API)
- Hardware RNG when available
- Fallback to OS entropy pool

**Server**: `crypto.randomBytes()` (Node.js)
- OpenSSL RAND_bytes
- Seeded from /dev/urandom (Linux) or CryptGenRandom (Windows)

**Quality Assurance**: NIST Statistical Test Suite compliance, continuous entropy monitoring (see CRYPTOGRAPHIC_RANDOMNESS.md)

---

## Key Management

**Generation**: Server-side during campaign creation (RSA key pair for encryption, RSA key pair for blind signatures)

**Storage**: PostgreSQL database (encrypted at rest)

**Distribution**: Public keys sent to clients (Phase 1); private keys never leave server

**Lifecycle**: Per-campaign keys (compromise isolation)

---

## Attack Resistance

| Attack | Defense | Mechanism |
|--------|---------|-----------|
| **Dictionary** | Random prefix (32 bytes) | RFC-9474 randomization |
| **Replay** | Signature tracking | used_signatures table (see DATABASE_DESIGN.md) |
| **Timing** | Random delays (1-5 min) | Redis queue (see SECURITY_ANALYSIS.md) |
| **Side-Channel** | Constant-time implementations | Library guarantees |

---

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| RSA key generation | ~200ms | One-time per campaign |
| Blind signature (client) | ~50ms | Blinding + unblinding |
| Blind signature (server) | ~30ms | Single signing operation |
| RSA-OAEP encryption | ~20ms | Per response |
| RSA-OAEP decryption | ~40ms | Per response (server) |
| SHA-256 hash | <1ms | Per commitment |

**Bottleneck**: RSA operations (acceptable for survey use case)

---

## Library Compatibility

**Client (Browser)**: @cloudflare/blindrsa-ts (npm), Web Crypto API (native)

**Server (Node.js)**: @cloudflare/blindrsa-ts (npm), Node.js crypto module (native)

**Blockchain (Rust)**: sha2 crate (hashing), solana-program (account operations)

---

## Library Versions

```json
{
  "@cloudflare/blindrsa-ts": "^0.10.0",
  "typescript": "^5.0.0",
  "node": "^20.0.0"
}
```

**Update Policy**: Follow security advisories, test before upgrading

---

## WebCrypto API Algorithm Support

The Web Crypto API (`crypto.subtle.generateKey()`) supports the following algorithms:

| Algorithm Family | Algorithms | Use Case | Used in Project? |
|-----------------|------------|----------|------------------|
| **RSA (Hashed)** | RSASSA-PKCS1-v1_5, RSA-PSS, RSA-OAEP | Signing, encryption | ✅ RSA-PSS (blind sig), RSA-OAEP (encryption) |
| **Elliptic Curve** | ECDSA, ECDH | Signing, key agreement | ❌ Not used |
| **HMAC** | HMAC | Message authentication | ❌ Not used |
| **AES** | AES-CTR, AES-CBC, AES-GCM, AES-KW | Symmetric encryption | ❌ Not used |
| **Ed25519** | Ed25519 | EdDSA signatures | ❌ Not used |
| **X25519** | X25519 | Key exchange | ❌ Not used |

### Why RSA Over Alternatives?

**Chosen**: RSA-PSS (blind signatures) + RSA-OAEP (encryption)

**Comparison with alternatives**:

| Property | RSA | ECDSA | Ed25519 |
|----------|-----|-------|---------|
| **Blind Signatures** | ✅ Supported (RFC-9474) | ❌ No standard | ❌ No standard |
| **Key Size** | 2048 bits | 256 bits | 256 bits |
| **Signature Size** | 256 bytes | 64 bytes | 64 bytes |
| **Performance** | Slower | Faster | Fastest |
| **Maturity** | Very mature (1977) | Mature (1985) | Recent (2011) |
| **Hardware Support** | Widespread | Common | Growing |

**Key Decision Factor**: Blind signature protocol (RFC-9474) **only exists for RSA**, not for elliptic curve algorithms. This is why we use RSA despite larger keys and slower performance.

**Why Not AES/HMAC?**
- AES requires shared symmetric keys (both parties need same key)
- RSA-OAEP provides public-key encryption (only admin needs private key)
- Survey responses must be encrypted such that **only admin** can decrypt

---

## Design Rationale

**Standards-Based**: All cryptography follows established RFCs and NIST guidelines

**Production-Tested**: Libraries used in production systems (Cloudflare, browsers)

**Type-Safe**: TypeScript throughout for compile-time safety

**Auditable**: Open-source implementations, peer-reviewed protocols

**Future-Proof**: NIST-approved until 2030, easy upgrade path to larger keys

---

## Summary

The cryptographic stack uses:
- **Standard algorithms** (RSA, SHA-2 family)
- **Established libraries** (@cloudflare/blindrsa-ts, Web Crypto)
- **Conservative parameters** (2048-bit RSA, 256-bit hashes)
- **Defense in depth** (multiple independent security layers)

This provides strong security guarantees while maintaining compatibility and auditability.
