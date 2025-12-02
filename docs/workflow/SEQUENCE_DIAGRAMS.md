# Double Blind Signature Workflow - Sequence Diagrams

This document contains sequence diagrams for the anonymous survey system using double blind signatures.

**Note**: These diagrams use Mermaid syntax. To view them:
- View on GitHub (renders automatically)
- Use VS Code with Mermaid extension
- Use online viewer: https://mermaid.live/

---

## Overview Diagram - All 4 Phases

```mermaid
sequenceDiagram
    actor Student
    participant Client
    participant Server
    participant Database
    participant Blockchain

    Note over Student,Blockchain: PHASE 1: Login & Token Blind Signature
    Student->>Client: Enters token
    Client->>Server: GET /api/login (token)
    Server->>Database: Check token.ticket = false
    Server->>Server: Create encrypted ticket
    Server->>Database: Mark token.ticket = true
    Server-->>Client: { surveys, encryptedTicket }
    Client->>Client: Blind token
    Client->>Server: POST /api/blind-sign-token
    Server->>Database: Check token.used = false
    Server->>Server: Sign blindedToken
    Server->>Database: Mark token.used = true
    Server-->>Client: { blindSignature }
    Client->>Client: Finalize tokenSignature
    Client->>Client: Save to localStorage

    Note over Student,Blockchain: PHASE 2: Complete Surveys (Multi-Session)
    loop For each survey
        Student->>Client: Complete survey
        Client->>Client: Encrypt answer, generate commitment
        Client->>Client: Save to localStorage
    end

    Note over Student,Blockchain: PHASE 3: Batch Submission & Receipt Signature
    Student->>Client: Click "Submit All"
    Client->>Client: Generate random receipt R, blind it
    Client->>Server: POST /api/responses/submit-batch
    Server->>Server: Verify tokenSignature
    Server->>Server: Decrypt ticket, verify count
    Server->>Server: Decrypt & validate responses
    Server->>Database: Store responses (anonymous)
    Server->>Server: Sign blindedReceipt
    Server->>Database: Store used signature pair
    Server-->>Client: { blindSignature }
    Client->>Client: Finalize receiptSignature
    Client->>Client: Download receipt.json
    Client->>Client: Clear localStorage

    Note over Student,Blockchain: PHASE 4: Claim Participation
    Student->>Client: Upload receipt.json + email
    Client->>Server: POST /api/participation/claim
    Server->>Server: Verify receiptSignature
    Server->>Database: Check not already claimed
    Server->>Database: Lookup token by email
    Server->>Database: Mark token.is_completed = true
    Server-->>Client: { success: true }

    Note over Student,Blockchain: OPTIONAL: Blockchain Verification
    Server->>Blockchain: Publish Merkle root (batched)
    Student->>Blockchain: Verify inclusion via Merkle proof
```

---

## Phase 1: Login & Token Blind Signature (Detailed)

```mermaid
sequenceDiagram
    actor Student
    participant Client
    participant Server
    participant Database
    participant BlindRSA as Blind Signature Library

    Note over Student,BlindRSA: Step 1: Get Ticket & Surveys

    Student->>Client: Enters token in login field
    activate Client

    Client->>Server: GET /api/login<br/>Authorization: Bearer <token>
    activate Server

    Server->>Database: SELECT * FROM tokens WHERE token = ?
    activate Database
    Database-->>Server: token record
    deactivate Database

    Server->>Server: Check: token.ticket === false?

    alt Ticket already issued
        Server-->>Client: Error: Ticket already issued
    else Ticket not issued
        Server->>Database: getSurveysForToken(token)
        activate Database
        Database-->>Server: surveys array
        deactivate Database

        Server->>Server: Count surveys (k = 3)
        Server->>Server: Create ticket: "ticket-type-3"
        Server->>Server: Encrypt ticket with server public key

        Server->>Database: UPDATE tokens SET ticket = true
        activate Database
        Database-->>Server: OK
        deactivate Database

        Server-->>Client: { surveys, encryptedTicket }
    end

    deactivate Server

    Note over Student,BlindRSA: Step 2: Get Token Blind Signature

    Client->>BlindRSA: suite.prepare(token)
    activate BlindRSA
    BlindRSA->>BlindRSA: Add 32 random bytes prefix
    BlindRSA-->>Client: preparedToken
    deactivate BlindRSA

    Client->>BlindRSA: suite.blind(publicKey, preparedToken)
    activate BlindRSA
    BlindRSA->>BlindRSA: Generate random r
    BlindRSA->>BlindRSA: Compute inv = r^(-1) mod n
    BlindRSA->>BlindRSA: Compute blindedToken = m * r^e mod n
    BlindRSA-->>Client: { blindedToken, inv }
    deactivate BlindRSA

    Client->>Server: POST /api/blind-sign-token<br/>Authorization: Bearer <token><br/>Body: { blindedToken }
    activate Server

    Server->>Database: SELECT * FROM tokens WHERE token = ?
    activate Database
    Database-->>Server: token record
    deactivate Database

    Server->>Server: Check: token.used === false?

    alt Token already used
        Server-->>Client: Error: Token already used
    else Token not used
        Server->>BlindRSA: suite.blindSign(privateKey, blindedToken)
        activate BlindRSA
        BlindRSA->>BlindRSA: Sign: blindSig = (blindedToken)^d mod n
        BlindRSA-->>Server: blindSignature
        deactivate BlindRSA

        Server->>Database: UPDATE tokens SET used = true
        activate Database
        Database-->>Server: OK
        deactivate Database

        Server-->>Client: { blindSignature }
    end

    deactivate Server

    Client->>BlindRSA: suite.finalize(publicKey, preparedToken, blindSignature, inv)
    activate BlindRSA
    BlindRSA->>BlindRSA: Unblind: sig = blindSig * inv mod n
    BlindRSA->>BlindRSA: Verify signature valid
    BlindRSA-->>Client: tokenSignature
    deactivate BlindRSA

    Note over Student,BlindRSA: Step 3: Save Session

    Client->>Client: localStorage.setItem('sessionData', {<br/>  token,<br/>  encryptedTicket,<br/>  preparedToken,<br/>  tokenSignature,<br/>  surveys,<br/>  completedSurveys: []<br/>})

    Client->>Student: Display surveys to complete

    deactivate Client
```

---

## Phase 2: Complete Surveys Incrementally (Detailed)

```mermaid
sequenceDiagram
    actor Student
    participant Client
    participant Crypto
    participant LocalStorage

    Note over Student,LocalStorage: Day 1: Complete Survey 1

    Student->>Client: Fill out Survey 1, click Submit
    activate Client

    Client->>Client: Parse survey data<br/>answerString = "surveyId|courseCode|teacherId|answers"

    Client->>Crypto: encrypt(answerString, serverPublicKey)
    activate Crypto
    Crypto->>Crypto: Apply RSA-OAEP (adds 32-byte random seed)
    Crypto-->>Client: encryptedAnswer
    deactivate Crypto

    Client->>Crypto: SHA256(answerString)
    activate Crypto
    Crypto-->>Client: commitment
    deactivate Crypto

    Client->>LocalStorage: Get sessionData
    activate LocalStorage
    LocalStorage-->>Client: sessionData
    deactivate LocalStorage

    Client->>Client: sessionData.completedSurveys.push({<br/>  surveyId,<br/>  encryptedAnswer,<br/>  commitment<br/>})

    Client->>LocalStorage: Save updated sessionData
    activate LocalStorage
    LocalStorage-->>Client: OK
    deactivate LocalStorage

    Client->>Student: Survey 1 saved ✓<br/>Progress: 1/3

    deactivate Client

    Note over Student,LocalStorage: Day 2: Complete Survey 2

    Student->>Client: Fill out Survey 2, click Submit
    activate Client

    Client->>Client: [Same encryption process]
    Client->>LocalStorage: Update sessionData (2/3)
    Client->>Student: Survey 2 saved ✓<br/>Progress: 2/3

    deactivate Client

    Note over Student,LocalStorage: Day 3: Complete Survey 3

    Student->>Client: Fill out Survey 3, click Submit
    activate Client

    Client->>Client: [Same encryption process]
    Client->>LocalStorage: Update sessionData (3/3)

    Client->>Client: Check: completedSurveys.length === surveys.length

    Client->>Student: Survey 3 saved ✓<br/>Progress: 3/3<br/><br/>✅ Show "Submit All Surveys" button

    deactivate Client
```

---

## Phase 3: Batch Submission & Receipt Signature (Detailed)

```mermaid
sequenceDiagram
    actor Student
    participant Client
    participant Server
    participant Database
    participant BlindRSA as Blind Signature Library

    Note over Student,BlindRSA: Step 1: Generate Receipt & Blind It

    Student->>Client: Click "Submit All Surveys"
    activate Client

    Client->>Client: Generate random receipt R<br/>R = crypto.randomBytes(32).toString('hex')

    Client->>BlindRSA: suite.prepare(R)
    activate BlindRSA
    BlindRSA->>BlindRSA: Add 32 random bytes prefix
    BlindRSA-->>Client: preparedReceipt
    deactivate BlindRSA

    Client->>BlindRSA: suite.blind(publicKey, preparedReceipt)
    activate BlindRSA
    BlindRSA->>BlindRSA: Generate random r
    BlindRSA->>BlindRSA: Compute inv = r^(-1) mod n
    BlindRSA->>BlindRSA: Compute blindedReceipt = m * r^e mod n
    BlindRSA-->>Client: { blindedReceipt, inv }
    deactivate BlindRSA

    Note over Student,BlindRSA: Step 2: Submit Batch

    Client->>Server: POST /api/responses/submit-batch<br/>Authorization: Bearer <preparedToken>.<tokenSignature><br/>Body: {<br/>  responses: [3 surveys],<br/>  encryptedTicket,<br/>  blindedReceipt<br/>}
    activate Server

    Note over Server: Step 3: Server Verification

    Server->>Server: Parse Authorization header<br/>[preparedToken, tokenSignature] = header.split('.')

    Server->>BlindRSA: suite.verify(publicKey, tokenSignature, preparedToken)
    activate BlindRSA
    BlindRSA->>BlindRSA: Verify RSA-PSS signature valid
    BlindRSA-->>Server: true/false
    deactivate BlindRSA

    alt Signature invalid
        Server-->>Client: Error 401: Invalid signature
    end

    Server->>Database: Check (preparedToken, tokenSignature)<br/>not in used_submission_signatures
    activate Database
    Database-->>Server: Not used
    deactivate Database

    Server->>Server: Decrypt ticket<br/>ticketString = decrypt(encryptedTicket, serverPrivateKey)
    Server->>Server: Parse ticket: "ticket-type-3" → expectedCount = 3
    Server->>Server: Check: responses.length === 3?

    alt Count mismatch
        Server-->>Client: Error 400: Survey count mismatch
    end

    loop For each response
        Server->>Server: Decrypt answer<br/>decrypted = decrypt(encryptedAnswer, serverPrivateKey)
        Server->>Server: Parse: "surveyId|courseCode|teacherId|answers"
        Server->>Server: Validate format and values
        Server->>Server: Recompute commitment = SHA256(decrypted)
        Server->>Server: Check: commitment matches?

        alt Validation fails
            Server-->>Client: Error 400: Invalid response
        end
    end

    Server->>Database: INSERT INTO survey_responses<br/>(commitment, encrypted_data, decrypted_data)
    activate Database
    Database-->>Server: OK
    deactivate Database

    Note over Server: Step 4: Sign Receipt

    Server->>BlindRSA: suite.blindSign(privateKey, blindedReceipt)
    activate BlindRSA
    BlindRSA->>BlindRSA: Sign: blindSig = (blindedReceipt)^d mod n
    BlindRSA-->>Server: blindSignature
    deactivate BlindRSA

    Server->>Database: INSERT INTO used_submission_signatures<br/>(preparedToken, tokenSignature)
    activate Database
    Database-->>Server: OK
    deactivate Database

    Server-->>Client: { blindSignature }
    deactivate Server

    Note over Client: Step 5: Finalize Receipt

    Client->>BlindRSA: suite.finalize(publicKey, preparedReceipt, blindSignature, inv)
    activate BlindRSA
    BlindRSA->>BlindRSA: Unblind: sig = blindSig * inv mod n
    BlindRSA->>BlindRSA: Verify signature valid
    BlindRSA-->>Client: receiptSignature
    deactivate BlindRSA

    Client->>Client: Create receipt file:<br/>{<br/>  R,<br/>  preparedReceipt,<br/>  receiptSignature,<br/>  campaignId,<br/>  submittedAt<br/>}

    Client->>Student: Download "survey-receipt.json"

    Client->>Client: localStorage.removeItem('sessionData')

    Client->>Student: ✅ Submission complete!<br/>Save your receipt for participation claim.

    deactivate Client
```

---

## Phase 4: Claim Participation (Detailed)

```mermaid
sequenceDiagram
    actor Student
    participant Client
    participant Server
    participant Database
    participant BlindRSA as Blind Signature Library

    Note over Student,BlindRSA: Before Campaign Closes

    Student->>Client: Navigate to claim page
    Student->>Client: Upload "survey-receipt.json"
    Student->>Client: Enter email address

    activate Client

    Client->>Client: Read receipt file<br/>Extract: { R, preparedReceipt, receiptSignature, campaignId }

    Client->>Server: POST /api/participation/claim<br/>Authorization: Bearer <preparedReceipt>.<receiptSignature><br/>Body: {<br/>  email,<br/>  campaignId<br/>}
    activate Server

    Note over Server: Step 1: Verify Receipt Signature

    Server->>Server: Parse Authorization header<br/>[preparedReceipt, receiptSignature] = header.split('.')

    Server->>BlindRSA: suite.verify(publicKey, receiptSignature, preparedReceipt)
    activate BlindRSA
    BlindRSA->>BlindRSA: Verify RSA-PSS signature valid
    BlindRSA-->>Server: true/false
    deactivate BlindRSA

    alt Signature invalid
        Server-->>Client: Error 401: Invalid receipt signature
    end

    Server->>Database: Check (preparedReceipt, receiptSignature)<br/>not in used_claim_signatures
    activate Database
    Database-->>Server: Not used
    deactivate Database

    alt Already claimed
        Server-->>Client: Error 409: Receipt already claimed
    end

    Note over Server: Step 2: Verify Student & Update

    Server->>Database: SELECT * FROM survey_tokens<br/>WHERE student_email = ? AND campaign_id = ?
    activate Database
    Database-->>Server: token record
    deactivate Database

    alt Token not found
        Server-->>Client: Error 404: Student not in campaign
    end

    Server->>Server: Check: token.used === true?

    alt Token not used (no authorization)
        Server-->>Client: Error 403: No survey submission found
    end

    Server->>Database: UPDATE survey_tokens<br/>SET is_completed = true<br/>WHERE token = ?
    activate Database
    Database-->>Server: OK
    deactivate Database

    Server->>Database: INSERT INTO used_claim_signatures<br/>(preparedReceipt, receiptSignature)
    activate Database
    Database-->>Server: OK
    deactivate Database

    Server-->>Client: { success: true, participationRecorded: true }
    deactivate Server

    Client->>Student: ✅ Participation claim successful!<br/>Your participation has been recorded.

    deactivate Client
```

---

## Privacy Analysis Diagram

```mermaid
graph TB
    subgraph "Phase 1: Token Blind Signature"
        T1[Token: abc123...]
        BS1[Blind Token: random1...]
        TS[Token Signature: sig1...]
    end

    subgraph "Phase 2&3: Receipt Blind Signature"
        R[Receipt R: xyz789...]
        BR[Blind Receipt: random2...]
        RS[Receipt Signature: sig2...]
        RESP[Survey Responses]
    end

    subgraph "Phase 4: Claim"
        EMAIL[Student Email]
        TOKEN[Token Record]
    end

    subgraph "Server Knowledge"
        SK1["Phase 1: Token X got authorization"]
        SK2["Phase 2&3: Someone submitted k surveys (ANONYMOUS)"]
        SK3["Phase 4: Token X participated"]
    end

    T1 -->|Blind with random r1| BS1
    BS1 -->|Server signs| TS

    R -->|Blind with random r2| BR
    BR -->|Server signs| RS

    TS -.->|UNLINKABLE due to r1| RESP
    RS -.->|UNLINKABLE due to r2| TOKEN

    T1 -->|Server sees| SK1
    RESP -->|Server sees| SK2
    EMAIL -->|Server sees| SK3

    SK1 -.->|CANNOT LINK| SK2
    SK2 -.->|CANNOT LINK| SK3

    style SK2 fill:#f9f,stroke:#333
    style RESP fill:#bbf,stroke:#333
```

---

## Blockchain Integration Diagram (Optional)

```mermaid
sequenceDiagram
    participant Admin
    participant Server
    participant Blockchain
    participant Student

    Note over Admin,Student: After Phase 3: Responses Submitted

    Admin->>Server: Click "Publish to Blockchain"
    activate Server

    Server->>Server: Collect all commitments from database
    Server->>Server: Build Merkle tree
    Server->>Server: Compute Merkle root

    Server->>Blockchain: publish_responses_merkle_root(<br/>  campaignId,<br/>  merkleRoot,<br/>  totalResponses<br/>)
    activate Blockchain
    Blockchain->>Blockchain: Store: { merkleRoot, totalResponses }
    Blockchain-->>Server: Transaction confirmed
    deactivate Blockchain

    deactivate Server

    Note over Admin,Student: Student Verification

    Student->>Student: Retrieve commitment from localStorage
    Student->>Server: Request Merkle proof
    activate Server
    Server->>Server: Generate Merkle proof for commitment
    Server-->>Student: { merkleProof }
    deactivate Server

    Student->>Blockchain: Query merkleRoot
    activate Blockchain
    Blockchain-->>Student: merkleRoot
    deactivate Blockchain

    Student->>Student: Verify: verifyMerkleProof(<br/>  commitment,<br/>  merkleProof,<br/>  merkleRoot<br/>)

    Student->>Student: ✅ Response verified on blockchain!

    Note over Admin,Student: After Phase 4: Claims Submitted

    Admin->>Server: Click "Publish Claims to Blockchain" (batched)
    activate Server

    Server->>Server: Fetch all receipt hashes from database
    Server->>Server: Build Merkle tree
    Server->>Server: Compute Merkle root

    Server->>Blockchain: update_claimed_receipts_root(<br/>  merkleRoot,<br/>  totalClaimedCount<br/>)
    activate Blockchain
    Blockchain->>Blockchain: Update: { claimedReceiptsRoot, claimedCount }
    Blockchain-->>Server: Transaction confirmed
    deactivate Blockchain

    deactivate Server

    Note over Admin,Student: Public Verification

    Student->>Blockchain: Query campaign data
    activate Blockchain
    Blockchain-->>Student: {<br/>  responsesRoot,<br/>  totalResponses,<br/>  claimedReceiptsRoot,<br/>  claimedCount<br/>}
    deactivate Blockchain

    Student->>Student: ✅ Verify total participation count
```

---

## Key Points

### Privacy Guarantees

1. **Phase 1 → Phase 2&3**: Unlinkable due to random blinding factor r1
2. **Phase 2&3 → Phase 4**: Unlinkable due to different blind signature key pair + random r2
3. **Server cannot link**:
   - Token to survey responses (blind signature unlinkability)
   - Receipt to token (different key pair + blind signature)

### Security Features

1. **Encrypted Ticket**: Enforces correct survey count, standardized per count
2. **Double Blind Signature**: Two independent blind signature layers
3. **Commitment Verification**: Ensures response integrity
4. **Used Signature Tracking**: Prevents replay attacks
5. **Blockchain Merkle Trees**: Provides public verifiability

### Multi-Session Support

- Student can complete surveys over multiple days
- Progress saved in localStorage
- Batch submission only when all k surveys complete
- Receipt downloaded at end (not stored in localStorage)

---

**Document Created**: 2025-12-01
**Compatible with**: DOUBLE_BLIND_SIGNATURE_WORKFLOW.md
**Mermaid Version**: Compatible with Mermaid 9.0+
