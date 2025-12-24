# Cryptographic Services

**Purpose**: Server-side security operations for anonymous yet verifiable surveys

---

## Service Categories

### 1. Key Management
- **Generation**: 2048-bit RSA key pair per campaign (one-time)
- **Storage**: Database encrypted-at-rest, only crypto service has access
- **Distribution**: Public key freely distributed, private key never leaves server
- **Isolation**: Each campaign has unique key pair

### 2. Blind Signature Generation
**Token Signing (Phase 1)**: Server signs blinded token → cannot determine which token
**Receipt Signing (Phase 3)**: Server signs blinded receipt with different blind factor → cannot link to token
**Verification**: Verify signatures in Phase 3 (auth) and Phase 4 (claim)
**Security**: Unforgeable without private key (RSA assumption)

See BLIND_RSA.md for protocol.

### 3. Response Encryption/Decryption
**Encryption** (Client): RSA-OAEP with random seed → identical responses encrypt differently
**Decryption** (Server): Temporary (validation only in Phase 3), aggregate analytics only
**Security**: Database breach doesn't reveal responses (requires private key)

### 4. Commitment Verification
**Scheme**: `commitment = SHA256(response)`
**Properties**: Binding, hiding, deterministic
**Verification**: Server decrypts temporarily → checks `SHA256(plaintext) == commitment`
**Ticket Commitment**: `SHA256({type: count})` binds student to survey count

### 5. Merkle Tree Construction
**Tree #1**: Response commitment hashes (published after submission closes)
**Tree #2**: Receipt signature hashes (published after claim closes)
**Proof Generation**: 10-15 sibling hashes for verification
**Trust Model**: Client trusts blockchain, not server database

See BLOCKCHAIN_ARCHITECTURE.md for details.

### 6. Random Delay Processing
**Process**: Client submits → server responds "Success" → queue with 1-5 min random delay → background processing
**Effect**: Timestamps uncorrelated with actual submission time
**Security**: Timing attack success reduced from 80-90% to 20-30%

### 7. Signature Replay Prevention
**Storage**: used_signatures table stores SHA-256 hash of signatures
**Tracking**: Authorization signatures (Phase 3), receipt signatures (Phase 4)
**Effect**: Signature can only be used once

---

## Security Properties

| Property | Mechanism | Security Level |
|----------|-----------|----------------|
| **Unlinkability** | Different blinding factors | Information-theoretic (RFC-9474) |
| **Confidentiality** | RSA-OAEP (2048-bit) | 112-bit (NIST until 2030) |
| **Integrity** | SHA-256 + Merkle trees | 128-bit collision resistance |
| **Replay Prevention** | Signature hash tracking | Database constraint |
| **Timing Decorrelation** | Random delay (1-5 min) | 20-30% attack success |

---

## Standards Compliance

| Standard | Components | Parameters |
|----------|------------|------------|
| **RFC-9474** | Blind RSA signatures | RSABSSA-SHA384-PSS-Randomized, 32-byte prefix, 256-byte blinding |
| **RFC-8017** | RSA-OAEP, RSA-PSS, MGF1 | 2048-bit keys, SHA-384/SHA-256 |
| **NIST FIPS 180-4** | SHA-256 hashing | 256-bit output |

**Implementation**: @cloudflare/blindrsa-ts, Web Crypto API, Node.js crypto

---

## Attack Resistance

| Attack | Defense | Success Probability |
|--------|---------|---------------------|
| **Linkage via Patterns** | Blind signature unlinkability | Negligible (2^-256) |
| **Dictionary on Commitments** | 5^25 combinations + 32-byte random prefix | Negligible |
| **Timing Correlation** | Random delay (1-5 min) | 20-30% (vs 80-90%) |
| **Replay** | Signature tracking | Zero (DB constraint) |
| **Tampering** | Commitments + Merkle trees | Zero (crypto integrity) |
| **Merkle Manipulation** | Blockchain immutability | Zero (requires blockchain compromise) |

---

## Key Management Best Practices

**Generation**: OS CSPRNG, secure server environment, verify parameters
**Storage**: Encrypted at rest, strict access control, encrypted backups
**Distribution**: Public key freely distributed, private key never leaves server
**Rotation**: Per-campaign keys (compromise isolation)

---

## Integration

**Client-Side** (see CLIENT_ARCHITECTURE.md): Blinding, message blinding/unblinding, encryption, commitments, Merkle verification

**Server-Side** (this doc): Key generation, blind signatures, decryption (validation), commitment verification, Merkle construction

**Blockchain** (see BLOCKCHAIN_ARCHITECTURE.md): Server computes/submits Merkle roots, client fetches/queries

---

## Summary

Server cryptographic services achieve anonymity and integrity through:

1. **Blind Signatures**: Sign without seeing plaintext (unlinkability)
2. **Key Management**: Generate/protect RSA pairs per campaign
3. **Response Encryption/Decryption**: Protect confidentiality, decrypt only for validation/analytics
4. **Commitment Verification**: Prove integrity without storing plaintext
5. **Merkle Trees**: Enable public verification
6. **Random Delays**: Break timing correlation
7. **Replay Prevention**: Track signature usage without linking identity

**Key Result**: Server can authenticate students, validate responses, generate analytics while being **cryptographically unable** to link student identities to responses.
