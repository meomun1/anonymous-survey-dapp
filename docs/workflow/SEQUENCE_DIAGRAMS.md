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
    Client->>Student: Download auth.json

    Note over Student,Blockchain: PHASE 2: Complete Surveys (Multi-Session)
    loop For each survey
        Student->>Client: Complete survey
        Client->>Client: Encrypt answer, generate commitment
        Client->>Client: Save to localStorage
    end

    Note over Student,Blockchain: PHASE 3: Batch Submission & Receipt Signature
    Student->>Client: Click "Submit All"
    Student->>Client: Upload auth.json
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
    Client->>Student: Download receipt.json
    Client->>Client: Clear localStorage

    Note over Student,Blockchain: PHASE 4: Claim Participation
    Student->>Client: Upload receipt.json + email
    Client->>Server: POST /api/participation/claim
    Server->>Server: Verify receiptSignature
    Server->>Database: Check not already claimed
    Server->>Database: Lookup token by email
    Server->>Database: Mark token.is_completed = true
    Server-->>Client: { success: true }

    Note over Student,Blockchain: Blockchain Verification
    Server->>Blockchain: Publish Merkle root (batched)
    Student->>Client: Input responese or receipt commitment
    Client->>Blockchain: Fetch response or receipt Merkle root
    Blockchain->>Client: Return Merkle root
    Client->>Server: GET /api/verification/merkle-proof
    Server->>Server: generate proof
    Server->>Server: check validity
    Server->>Client: { success: true }
