# Double Blind Signature Workflow Documentation

## Overview
This document describes the proposed workflow using double blind signature layers to achieve anonymous survey submission while tracking student participation.

---

## Workflow Phases

### Phase 1: Login & First Blind Signature (on Token) + Ticket Issuance

**Flow**:

**User Action**: Student enters token in login field and clicks "Login"

**Behind the scenes (Client handles automatically)**:

**Step 1: Get Ticket & Surveys**
1. Client → Server: `GET /api/login` with `Authorization: Bearer <token>`
2. Server:
   - Checks: `token.ticket === false` (prevents multiple ticket requests)
   - Looks up token, gets surveys via `getSurveysForToken(token)`
   - Counts surveys (k = 3 for example)
   - Creates ticket commitment: `ticketCommitment = SHA256('{"type":3}')`
   - Marks token as `ticket = true` in database
3. Server → Client: `{ surveys, ticketCommitment }`

**Note**: Ticket commitment is generated on-the-fly (not stored in database). All students with 3 surveys get identical commitment.

**Step 2: Get Blind Signature (Automatically after Step 1)**
4. Client blinds token: `preparedToken = suite.prepare(token)`, `{blindedToken, inv} = suite.blind(publicKey, preparedToken)`
5. Client → Server: `POST /api/blind-sign-token` with `Authorization: Bearer <token>` and `Body: { blindedToken }`
6. Server:
   - Checks: `token.used === false` (prevents multiple blind signature requests)
   - Signs blinded token: `blindSignature = suite.blindSign(privateKey, blindedToken)`
   - Marks token as `used = true` in database
7. Server → Client: `{ blindSignature }`
8. Client finalizes: `tokenSignature = suite.finalize(publicKey, preparedToken, blindSignature, inv)`

**Step 3: Save Session & Show Surveys**
9. Client saves everything to localStorage:
   ```javascript
   localStorage.setItem('sessionData', JSON.stringify({
     token,                    // Original token
     ticketCommitment,         // SHA-256 commitment from server (identical for same count)
     preparedToken,            // Prepared token for authorization
     tokenSignature,           // Blind signature on token
     surveys: [...],           // List of surveys to complete
     completedSurveys: []      // Will store responses as student completes them
   }));
   ```
10. Client shows survey list to student → Student sees available surveys to complete

**Result**: Student has authorization credential + ticket commitment for submission, all saved in localStorage

**Prevention**:
- `ticket = true`: Token can only get ticket once
- `used = true`: Token can only get blind signature once

**Key Feature**: All students needing 3 surveys get identical `ticketCommitment` (preserves anonymity)

**LocalStorage Purpose**: Student may complete surveys over multiple sessions (e.g., survey 1 today, survey 2 tomorrow). Data persists until batch submission completes.

---

### Phase 2 & 3: Batch Submission + Get Receipt Signature

**User Action**: Student completes surveys one by one over time

**Behind the scenes (Client handles)**:

**Step 1: Complete Surveys Incrementally**
1. Student completes survey 1 → clicks "Submit"
2. Client:
   - Encrypts answer: `encryptedAnswer = encrypt(answerString, serverPublicKey)`
   - Generates commitment: `commitment = SHA256(answerString)`
   - Stores in localStorage:
     ```javascript
     const sessionData = JSON.parse(localStorage.getItem('sessionData'));
     sessionData.completedSurveys.push({
       surveyId,
       encryptedAnswer,
       commitment
     });
     localStorage.setItem('sessionData', JSON.stringify(sessionData));
     ```
3. Repeat for survey 2, survey 3... until all k surveys completed

**Step 2: Batch Submission (When All k Surveys Complete)**
4. Client checks: `completedSurveys.length === surveys.length` → Shows "Submit All Surveys" button
5. Student clicks "Submit All Surveys" button
6. Client generates random receipt `R`, blinds it:
   ```javascript
   const R = crypto.randomBytes(32).toString('hex');
   const preparedReceipt = suite.prepare(R);
   const { blindedReceipt, inv } = await suite.blind(publicKey, preparedReceipt);
   ```
7. Client → Server: `POST /api/responses/submit-batch`
   ```
   Authorization: Bearer <preparedToken>.<tokenSignature>
   Body: {
     responses: completedSurveys,  // Array of k responses
     ticketCommitment,              // SHA-256 commitment from Phase 1
     blindedReceipt
   }
   ```

**Step 3: Server Verification**
8. Server:
   - Parses Authorization: `[preparedToken, tokenSignature] = header.split('.')`
   - Verifies signature: `suite.verify(publicKey, tokenSignature, preparedToken)`
   - Checks signature pair not already used (in `used_submission_signatures`)
   - Verifies ticket commitment:
     ```javascript
     const expectedCommitment = SHA256(`{"type":${responses.length}}`);
     if (ticketCommitment !== expectedCommitment) {
       throw new Error('Ticket mismatch');
     }
     ```
   - Verifies count matches commitment
   - For each response:
     - Decrypts answer: `decrypted = decrypt(encryptedAnswer, serverPrivateKey)`
     - Parses answer string: `surveyId|courseCode|teacherId|answers`
     - Validates format and values (e.g., valid surveyId, valid ratings 1-5)
     - Verifies commitment: `SHA256(decrypted) === commitment`
     - If any validation fails → reject entire batch
   - Stores decrypted responses and commitments in database

**Step 4: Get Receipt Signature**
9. Server signs blinded receipt: `blindSignature = suite.blindSign(privateKey, blindedReceipt)`
10. Server stores `(preparedToken, tokenSignature)` in `used_submission_signatures`
11. Server → Client: `{ blindSignature }`
12. Client finalizes: `receiptSignature = suite.finalize(publicKey, preparedReceipt, blindSignature, inv)`
13. Client creates downloadable receipt file:
    ```javascript
    const receiptData = {
      R,
      preparedReceipt,
      receiptSignature,
      campaignId,
      submittedAt: new Date().toISOString()
    };
    // Trigger download as JSON file
    downloadFile('survey-receipt.json', JSON.stringify(receiptData, null, 2));
    ```
14. Client clears localStorage (survey session complete):
    ```javascript
    localStorage.removeItem('sessionData');
    ```

**Result**: Decrypted responses stored on server (anonymous), student has receipt credential

**Prevention**:
- Each authorization signature can only be used once for submission
- Ticket enforces correct number of surveys submitted

**Key Privacy**:
- Server has decrypted responses but doesn't know which student submitted them
- Students with same survey count have identical tickets (unlinkable)

**Multi-Session Support**: Student can complete survey 1 today, survey 2 tomorrow. Client saves progress incrementally. Batch submission only happens when all k surveys completed.

---

### Phase 4: Claim Participation (Before Campaign Closes)

**User Action**: Student uploads receipt file and enters email

**Behind the scenes (Client handles)**:

**Step 1: Upload Receipt**
1. Student navigates to claim page
2. Student uploads `survey-receipt.json` file (downloaded from Phase 2&3)
3. Student enters their email address
4. Client reads receipt file, extracts `{ R, preparedReceipt, receiptSignature, campaignId }`
5. Client → Server: `POST /api/participation/claim`
   ```
   Authorization: Bearer <preparedReceipt>.<receiptSignature>
   Body: {
     email,
     campaignId
   }
   ```

**Step 2: Server Verification**
6. Server:
   - Parses Authorization: `[preparedReceipt, receiptSignature] = header.split('.')`
   - Verifies receipt signature: `suite.verify(publicKey, receiptSignature, preparedReceipt)`
   - Checks receipt not already claimed (in `used_claim_signatures`)
   - Looks up token by email and campaignId: `SELECT token FROM survey_tokens WHERE student_email = $1 AND campaign_id = $2`
   - Verifies token is `used = true` (student got authorization in Phase 1)
   - Marks token as `is_completed = true`
   - Stores `(preparedReceipt, receiptSignature)` in `used_claim_signatures`
7. Server → Client: `{ success: true, participationRecorded: true }`

**Result**: Participation recorded in database

**Prevention**: Each receipt signature can only be used once for claiming

**Key Privacy**: Claim timing is unpredictable (student can claim anytime before campaign closes), making timing correlation difficult

---

## Privacy Guarantees

**Unlinkability**: Server cannot link Phase 1 ↔ Phase 2&3 ↔ Phase 4 due to blind signature randomization

**What server knows**:
- Phase 1: "Token X got authorization"
- Phase 2&3: "Someone submitted k valid surveys" (doesn't know who)
- Phase 4: "Token X participated" (doesn't know which responses)

**Result**: Server knows participation but cannot link tokens to specific survey responses

---

## Current Constraints

### 1. Response Validity Verification
✅ **SOLVED**: Server decrypts and verifies commitments in Phase 2&3 before signing receipt

### 2. Correct Survey Count Enforcement
✅ **SOLVED**: SHA-256 ticket commitment system
- Server generates ticket commitment in Phase 1: `SHA256('{"type":3}')`
- Commitment is deterministic (students with same count get identical commitment)
- Client stores commitment in localStorage
- Server verifies commitment matches response count in Phase 3
- Students cannot modify commitment (would fail verification)

### 3. Preventing Double-Use of Signatures
✅ **SOLVED**: Database tables track used signature pairs
- `used_submission_signatures`: Prevents reusing authorization
- `used_claim_signatures`: Prevents reclaiming participation

**Open Question**: Better alternatives than database tracking?

### 4. Blockchain Integration
✅ **SOLVED**: Smart contract for participation claims + Merkle tree for response verification

**Solution**:
- **Use Case 1**: Publish Merkle root of commitments on blockchain (Phase 2&3)
  - Students can verify their responses were included
  - Immutable proof responses weren't tampered with
- **Use Case 2**: Smart contract enforces one-time receipt claims (Phase 4)
  - Prevents double-claiming participation
  - Provides transparent public participation count
  - Decentralized enforcement (server cannot manipulate)

**Cost**: ~$20 for 20,000 students (vs $5,200 full blockchain approach)

**See**: `/BLOCKCHAIN_INTEGRATION.md` for detailed design and implementation

---

## Document Status

**Created**: 2025-11-27
**Last Updated**: 2025-11-27
**Status**: Draft - Workflow defined, blockchain integration research needed
