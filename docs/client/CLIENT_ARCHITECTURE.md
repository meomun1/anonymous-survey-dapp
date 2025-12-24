# Client Architecture

**Framework**: Next.js 14 | **Language**: TypeScript

---

## Overview

Web interface for **Admin**, **Teacher**, **Student** roles with client-side cryptography for anonymity.

**Core Principles**: Client-side cryptography, zero-knowledge submission, session-based workflow, role-based access, public verification

---

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS
- **Cryptography**: @cloudflare/blindrsa-ts (blind signatures), Web Crypto API (RSA-OAEP, SHA-256)
- **State**: React Context (auth), SessionStorage (workflow data), LocalStorage (persistent tokens)

---

## Application Structure

- **Pages**: `/app/admin/*` (dashboard), `/app/teacher/*` (read-only views), `/app/student/*` (survey workflow), `/app/verify/[campaignId]` (public)
- **Libraries**: `/lib/api/*` (API clients), `/lib/crypto/*` (crypto utilities)

---

## User Workflows

### Admin
- University structure management (schools, teachers, courses, students)
- Enrollment and course assignment (admin handles all)
- Campaign lifecycle (launch, publish Merkle roots, close)
- Analytics and CSV import

### Teacher (Read-Only)
- View campaigns, assigned courses, enrolled students
- View student participation scores (not actual responses)
- **No data input** (admin manages all)

### Student (Four-Phase Protocol)

| Phase | Action | Crypto Operation |
|-------|--------|------------------|
| **1** | Login with token | Blind RSA signature (token) |
| **2** | Complete surveys offline | SHA-256 commitments + RSA-OAEP encryption |
| **3** | Submit responses, get receipt | Blind RSA signature (receipt) |
| **4** | Manually claim participation | Receipt signature verification |

**Phase Details**:
1. Enter token → blind → server signs → unblind (token signature in sessionStorage)
2. Answer questions → commit → encrypt → store locally (offline)
3. Submit all → server verifies token sig → server signs receipt → download proof file (commitments, receipt, receipt sig)
4. Manually input email + prepared receipt + receipt sig → server verifies → records participation

**Important**: Students manually input claim fields (no file upload) for security awareness

See ANONYMOUS_SURVEY_WORKFLOW.md for protocol details.

---

## Client-Side Cryptography

### Blind RSA Signatures
- **Token blinding** (Phase 1): Proves legitimacy without revealing which token
- **Receipt blinding** (Phase 3): Proves submission without revealing which responses
- **Unlinkability**: Server cannot link Phase 1 ↔ Phase 3 (different blinding factors)

### RSA-OAEP Encryption
- Campaign public key distributed during login
- Client encrypts responses (2048-bit RSA-OAEP)
- Admin decrypts after campaign closes

### SHA-256 Commitments
- Client hashes plaintext before encryption
- Stored with encrypted response
- Enables tamper detection and Merkle tree construction

See BLIND_RSA.md and CRYPTOGRAPHIC_RANDOMNESS.md for details.

---

## State Management

- **SessionStorage**: Token signatures, survey list, campaign keys, encrypted responses, receipts (cleared after Phase 4)
- **LocalStorage**: Duplicate sessionStorage (edge case: multiple logins), admin/teacher JWT tokens
- **React Context**: User authentication, role

---

## Verification System

**Public Verification Page** (`/verify/[campaignId]`):
- **Response Verification**: Student inputs commitment → server provides Merkle proof → client verifies against blockchain root (Tree #1)
- **Participation Verification**: Student inputs email + prepared receipt + receipt sig → server provides Merkle proof → client verifies against blockchain root (Tree #2)

**No authentication required** (transparency)

See BLOCKCHAIN_ARCHITECTURE.md for Merkle tree details.

---

## Campaign Management

**States**: Draft → Open → Launched → Closed → Published

**Admin Actions**:
- Initialize campaign (blockchain account creation)
- Publish Merkle roots (Tree #1: responses, Tree #2: participation claims)
- Close on blockchain (irreversible)

**Important**: "Teachers Input" state removed (admin handles all data)

---

## Security

### Why Client-Side Cryptography?
1. Server never sees plaintext responses or unblinded tokens
2. Student proves legitimacy without revealing identity
3. Token sig and receipt sig unlinkable (different blind factors)
4. Minimizes trust in server

### Data Flow Security

| Phase | Server Sees | Server Does NOT See |
|-------|-------------|---------------------|
| **1** | Blinded token | Actual token value |
| **2** | Nothing (offline) | Progress, answers |
| **3** | Token sig + encrypted responses | Plaintext, actual token |
| **4** | Receipt sig + email | Responses, token |

**Result**: Server cannot link email → token → responses

See SECURITY_ANALYSIS.md and PRIVACY_GUARANTEES.md for details.

---

## Summary

Client implements multi-phase cryptographic protocol in browser achieving:
1. **Complete Anonymity**: Server cannot link student to responses
2. **Verifiable Integrity**: Merkle proofs enable public verification
3. **User-Friendly**: Complex crypto hidden behind simple UI
4. **Role Separation**: Distinct interfaces per role

**Key Innovation**: Client-side blind signatures + encryption = cryptographic anonymity (not policy-based).
