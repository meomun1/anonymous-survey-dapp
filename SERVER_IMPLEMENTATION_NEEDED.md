# Server Implementation Needed
**Date**: 2025-12-02 | **Status**: Gap Analysis

## Purpose

This document compares the **DOUBLE_BLIND_SIGNATURE_WORKFLOW.md** (what we designed) with **current server implementation** (what exists) to identify what needs to be built.

---

## Current Status ✅

### What EXISTS in server:

1. **Blind Signature** ✅
   - `POST /api/crypto/campaigns/:campaignId/blind-sign`
   - Takes `blindedMessage`, returns `blindSignature`
   - Uses campaign keys

2. **Token Management** ✅
   - `POST /api/tokens/verify` - Validates token
   - `POST /api/tokens/:token/use` - Mark as used
   - `POST /api/tokens/:token/complete` - Mark as completed
   - Token table has: `used`, `is_completed`, `blockchain_submitted`

3. **Response Submission** ⚠️ **PARTIAL**
   - `POST /api/responses/submit` - Exists but OLD design
   - Submits to blockchain directly (not double blind signature workflow)

4. **Encryption/Decryption** ✅
   - `POST /api/crypto/campaigns/:campaignId/decrypt`
   - Campaign-level keys working

---

## What's MISSING ❌

### Phase 1: Login & First Blind Signature + Ticket

**Workflow says:**
```
1. Student → GET /api/login (with Bearer token)
2. Server checks token.ticket === false
3. Server creates encrypted ticket
4. Server marks token.ticket = true
5. Returns { surveys, encryptedTicket }

Then automatically:
6. Student → POST /api/blind-sign-token (with blindedToken)
7. Server signs, marks token.used = true
8. Returns { blindSignature }
```

**What's missing:**

❌ **No `/api/login` endpoint**
- Need to create this route
- Should return surveys + encrypted ticket

❌ **No `ticket` field in database**
- `survey_tokens` table missing `ticket` boolean column
- Need migration: `ALTER TABLE survey_tokens ADD COLUMN ticket BOOLEAN DEFAULT false`

❌ **No ticket generation logic**
- Need function to create `"ticket-type-k"` string
- Need to encrypt ticket with campaign public key
- OR use SHA-256 commitment (security fix)

❌ **No `/api/blind-sign-token` endpoint**
- Need separate endpoint for token blind signature
- Different from `/api/crypto/campaigns/:campaignId/blind-sign` (that's generic)
- Should specifically handle Phase 1 token signing

---

### Phase 2 & 3: Batch Submission + Receipt Signature

**Workflow says:**
```
Student → POST /api/responses/submit-batch
Authorization: Bearer <preparedToken>.<tokenSignature>
Body: {
  responses: [...],      // k completed surveys
  encryptedTicket,
  blindedReceipt
}

Server:
1. Verifies authorization signature
2. Decrypts + verifies ticket
3. Validates all responses
4. Signs blindedReceipt
5. Stores signature pair in used_submission_signatures
6. Returns { blindSignature }
```

**What's missing:**

❌ **No `/api/responses/submit-batch` endpoint**
- Current `/api/responses/submit` is OLD design
- Need NEW endpoint for double blind signature workflow

❌ **No authorization verification**
- Need to parse `Authorization: Bearer <preparedToken>.<tokenSignature>`
- Need to verify blind signature on token
- Use @cloudflare/blindrsa-ts `suite.verify()`

❌ **No ticket verification**
- Need to decrypt `encryptedTicket`
- Extract expected count from `"ticket-type-k"`
- Verify `responses.length === k`

❌ **No `used_submission_signatures` table**
- Need to store `(preparedToken, tokenSignature)` pairs
- Prevents reusing same authorization
- Schema: `CREATE TABLE used_submission_signatures (id, prepared_token TEXT, token_signature TEXT, used_at TIMESTAMP)`

❌ **No receipt blind signature**
- Need to sign `blindedReceipt` with campaign keys
- Return `blindSignature` for client to finalize

---

### Phase 4: Claim Participation

**Workflow says:**
```
Student → POST /api/participation/claim
Authorization: Bearer <preparedReceipt>.<receiptSignature>
Body: {
  email,
  campaignId
}

Server:
1. Verifies receipt signature
2. Checks not already claimed (in used_claim_signatures)
3. Looks up token by email + campaignId
4. Marks token.is_completed = true
5. Stores signature in used_claim_signatures
6. Returns { success: true }
```

**What's missing:**

❌ **No `/api/participation/claim` endpoint**
- Need to create this route
- Handles Phase 4 claims

❌ **No `used_claim_signatures` table**
- Need to store `(preparedReceipt, receiptSignature)` pairs
- Prevents double-claiming
- Schema: `CREATE TABLE used_claim_signatures (id, prepared_receipt TEXT, receipt_signature TEXT, claimed_at TIMESTAMP)`

❌ **No receipt verification logic**
- Parse authorization header
- Verify blind signature on receipt
- Check against used signatures

---

## Database Changes Needed

### 1. Add `ticket` column
```sql
ALTER TABLE survey_tokens
ADD COLUMN ticket BOOLEAN DEFAULT false;
```

### 2. Create signature tracking tables
```sql
-- Track used submission authorizations
CREATE TABLE used_submission_signatures (
  id TEXT PRIMARY KEY,
  prepared_token TEXT NOT NULL,
  token_signature TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  used_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(prepared_token, token_signature),
  FOREIGN KEY (campaign_id) REFERENCES survey_campaigns(id)
);

-- Track used claim receipts
CREATE TABLE used_claim_signatures (
  id TEXT PRIMARY KEY,
  prepared_receipt TEXT NOT NULL,
  receipt_signature TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  student_email TEXT NOT NULL,
  claimed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(prepared_receipt, receipt_signature),
  FOREIGN KEY (campaign_id) REFERENCES survey_campaigns(id)
);
```

---

## New Routes Needed

### 1. Phase 1 Routes

```typescript
// GET /api/login
// Returns surveys + encrypted ticket
router.get('/login', authMiddleware, loginController.getTicketAndSurveys);

// POST /api/blind-sign-token
// Signs blinded token, marks token.used = true
router.post('/blind-sign-token', authMiddleware, cryptoController.blindSignToken);
```

### 2. Phase 3 Routes

```typescript
// POST /api/responses/submit-batch
// Batch submission with authorization + receipt signing
router.post('/responses/submit-batch',
  verifyBlindSignature,  // Middleware to verify authorization
  responseController.submitBatch
);
```

### 3. Phase 4 Routes

```typescript
// POST /api/participation/claim
// Claim participation with receipt signature
router.post('/participation/claim',
  verifyReceiptSignature,  // Middleware to verify receipt
  participationController.claimParticipation
);
```

---

## New Middleware Needed

### 1. Verify Blind Signature Middleware

```typescript
// middleware/verifyBlindSignature.ts
export async function verifyBlindSignature(req, res, next) {
  const auth = req.headers.authorization; // "Bearer <preparedToken>.<tokenSignature>"

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization' });
  }

  const [preparedToken, tokenSignature] = auth.substring(7).split('.');

  // Get campaign public key
  const { blindSignaturePublicKey } = await getCampaignKeys(campaignId);

  // Verify signature
  const suite = RSABSSA.SHA384.PSS.Randomized();
  const isValid = await suite.verify(
    blindSignaturePublicKey,
    Buffer.from(tokenSignature, 'base64'),
    Buffer.from(preparedToken, 'base64')
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Check if already used
  const used = await checkSignatureUsed(preparedToken, tokenSignature);
  if (used) {
    return res.status(409).json({ error: 'Authorization already used' });
  }

  req.blindAuth = { preparedToken, tokenSignature };
  next();
}
```

### 2. Verify Receipt Signature Middleware

```typescript
// middleware/verifyReceiptSignature.ts
export async function verifyReceiptSignature(req, res, next) {
  const auth = req.headers.authorization; // "Bearer <preparedReceipt>.<receiptSignature>"

  const [preparedReceipt, receiptSignature] = auth.substring(7).split('.');

  // Verify + check not claimed
  // Similar to above

  req.receiptAuth = { preparedReceipt, receiptSignature };
  next();
}
```

---

## New Controllers Needed

### 1. LoginController

```typescript
// controllers/login.controller.ts
export class LoginController {
  async getTicketAndSurveys(req, res) {
    const token = req.user.token; // From authMiddleware

    // Check ticket not issued yet
    const tokenData = await tokenService.getToken(token);
    if (tokenData.ticket) {
      return res.status(400).json({ error: 'Ticket already issued' });
    }

    // Get surveys
    const surveys = await surveyService.getSurveysForToken(token);

    // Create ticket
    const k = surveys.length;
    const ticketString = `ticket-type-${k}`;

    // Encrypt ticket (or use SHA-256 commitment for security)
    const encryptedTicket = await cryptoService.encryptTicket(
      ticketString,
      campaignId
    );

    // Mark ticket issued
    await tokenService.markTicketIssued(token);

    res.json({ surveys, encryptedTicket });
  }
}
```

### 2. Update CryptoController

```typescript
// controllers/crypto.controller.ts
export class CryptoController {
  // NEW: Blind sign token (Phase 1)
  async blindSignToken(req, res) {
    const { blindedToken } = req.body;
    const token = req.user.token;

    // Check not already used
    const tokenData = await tokenService.getToken(token);
    if (tokenData.used) {
      return res.status(400).json({ error: 'Token already used' });
    }

    // Sign
    const blindSignature = await cryptoService.blindSign(
      blindedToken,
      campaignId
    );

    // Mark used
    await tokenService.markTokenUsed(token);

    res.json({ blindSignature });
  }
}
```

### 3. Update ResponseController

```typescript
// controllers/response.controller.ts
export class ResponseController {
  // NEW: Batch submission (Phase 3)
  async submitBatch(req, res) {
    const { responses, encryptedTicket, blindedReceipt } = req.body;
    const { preparedToken, tokenSignature } = req.blindAuth;

    // Decrypt ticket
    const ticketString = await cryptoService.decryptTicket(
      encryptedTicket,
      campaignId
    );

    // Extract expected count
    const expectedCount = parseInt(ticketString.split('-')[2]);

    // Verify count
    if (responses.length !== expectedCount) {
      return res.status(400).json({ error: 'Response count mismatch' });
    }

    // Validate all responses
    for (const response of responses) {
      await validateResponse(response);
    }

    // Store responses
    await responseService.storeResponses(responses, campaignId);

    // Sign receipt
    const blindSignature = await cryptoService.blindSign(
      blindedReceipt,
      campaignId
    );

    // Mark authorization used
    await signatureService.markSubmissionUsed(
      preparedToken,
      tokenSignature,
      campaignId
    );

    res.json({ blindSignature });
  }
}
```

### 4. ParticipationController (NEW)

```typescript
// controllers/participation.controller.ts
export class ParticipationController {
  async claimParticipation(req, res) {
    const { email, campaignId } = req.body;
    const { preparedReceipt, receiptSignature } = req.receiptAuth;

    // Look up token
    const tokenData = await tokenService.getTokenByEmail(email, campaignId);
    if (!tokenData) {
      return res.status(404).json({ error: 'Token not found' });
    }

    // Verify token was used (got authorization in Phase 1)
    if (!tokenData.used) {
      return res.status(400).json({ error: 'Token not authorized' });
    }

    // Mark completed
    await tokenService.markCompleted(tokenData.token);

    // Store receipt as claimed
    await signatureService.markReceiptClaimed(
      preparedReceipt,
      receiptSignature,
      campaignId,
      email
    );

    res.json({ success: true, participationRecorded: true });
  }
}
```

---

## Implementation Priority

### High Priority (Core Workflow)
1. ✅ Database migrations (`ticket`, signature tables)
2. ✅ `/api/login` endpoint (Phase 1)
3. ✅ `/api/blind-sign-token` endpoint (Phase 1)
4. ✅ `/api/responses/submit-batch` endpoint (Phase 3)
5. ✅ `/api/participation/claim` endpoint (Phase 4)
6. ✅ Blind signature verification middleware
7. ✅ Ticket encryption/decryption logic

### Medium Priority (Security Fixes)
8. ⚠️ SHA-256 commitment (replace RSA-OAEP tickets)
9. ⚠️ Idempotency support
10. ⚠️ Random delay (1-5 min queue)
11. ⚠️ CSP headers

### Low Priority (Infrastructure)
12. 🔹 Redis queue setup
13. 🔹 nginx mixing proxy
14. 🔹 IP logging removal

---

## Estimated Implementation Time

**Core Workflow (Priority 1-7)**: 2 days
- Database migrations: 2 hours
- Phase 1 endpoints: 4 hours
- Phase 3 endpoint: 6 hours
- Phase 4 endpoint: 3 hours
- Middleware: 3 hours
- Testing: 4 hours

**Security Fixes (Priority 8-11)**: 1 day
**Infrastructure (Priority 12-14)**: 1 day

**Total**: 4 days for complete implementation

---

## Next Steps

1. **Review this document** with team
2. **Create database migration** scripts
3. **Implement Phase 1** (login + token blind signature)
4. **Implement Phase 3** (batch submission + receipt)
5. **Implement Phase 4** (claim participation)
6. **Test workflow** end-to-end
7. **Add security fixes** (commitments, idempotency, delays)
8. **Deploy infrastructure** (Redis, nginx proxy)

---

**Document Status**: Ready for Implementation
**Last Updated**: 2025-12-02
